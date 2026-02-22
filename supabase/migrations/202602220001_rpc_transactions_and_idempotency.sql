create table if not exists public.api_idempotency_keys (
  id bigserial primary key,
  scope text not null,
  request_id text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  unique (scope, request_id)
);

create or replace function public.rpc_create_flight_handle_txn(
  p_application_id uuid,
  p_visa_handle_id uuid,
  p_entry_count integer,
  p_actual_departure_at timestamp,
  p_arrival_at timestamp,
  p_depart_city text,
  p_arrive_city text,
  p_ticket_amount numeric,
  p_ticket_image_url text,
  p_issuer_company text,
  p_operator text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing jsonb;
  v_remaining integer;
  v_new_remaining integer;
  v_handle_id uuid;
  v_now timestamptz := now();
  v_resp jsonb;
begin
  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    select response into v_existing
    from public.api_idempotency_keys
    where scope = 'flight_handle' and request_id = p_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select id into v_handle_id
  from public.cn_flight_handles
  where application_id = p_application_id
  limit 1;
  if v_handle_id is not null then
    v_resp := jsonb_build_object('ok', true, 'code', 'ALREADY_DONE', 'message', '机票已办理，返回已有记录', 'handle_id', v_handle_id);
    if p_request_id is not null and length(trim(p_request_id)) > 0 then
      insert into public.api_idempotency_keys(scope, request_id, response)
      values ('flight_handle', p_request_id, v_resp)
      on conflict (scope, request_id) do nothing;
    end if;
    return v_resp;
  end if;

  select remaining_times into v_remaining
  from public.cn_visa_handles
  where id = p_visa_handle_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'VISA_NOT_FOUND', 'message', '签证记录不存在');
  end if;

  if v_remaining is not null and v_remaining <> -1 and v_remaining < p_entry_count then
    return jsonb_build_object('ok', false, 'code', 'VISA_REMAINING_NOT_ENOUGH', 'message', format('签证剩余次数不足，当前剩余 %s 次', v_remaining));
  end if;

  v_new_remaining := case when v_remaining is null or v_remaining = -1 then -1 else greatest(0, v_remaining - p_entry_count) end;

  insert into public.cn_flight_handles (
    application_id, actual_departure_at, arrival_at, depart_city, arrive_city,
    entry_count, ticket_amount, ticket_image_url, issuer_company, operator, created_at
  ) values (
    p_application_id, p_actual_departure_at, p_arrival_at, p_depart_city, p_arrive_city,
    p_entry_count, p_ticket_amount, p_ticket_image_url, p_issuer_company, p_operator, v_now
  ) returning id into v_handle_id;

  update public.cn_visa_handles set remaining_times = v_new_remaining where id = p_visa_handle_id;
  update public.cn_flight_applications set status = 'done', updated_at = v_now where id = p_application_id;

  v_resp := jsonb_build_object('ok', true, 'code', 'SUCCESS', 'message', '机票办理成功', 'handle_id', v_handle_id);

  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    insert into public.api_idempotency_keys(scope, request_id, response)
    values ('flight_handle', p_request_id, v_resp)
    on conflict (scope, request_id) do update set response = excluded.response;
  end if;

  return v_resp;
end;
$$;

create or replace function public.rpc_create_contract_with_attachments_txn(
  p_request_id text,
  p_contract jsonb,
  p_version jsonb,
  p_files jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing jsonb;
  v_contract_id uuid;
  v_version_id uuid;
  v_resp jsonb;
begin
  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    select response into v_existing
    from public.api_idempotency_keys
    where scope = 'contract_create' and request_id = p_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  begin
    insert into public.contracts(contract_no, business_type, account_name, customer_display_name, created_at)
    values (
      p_contract->>'contract_no',
      p_contract->>'business_type',
      p_contract->>'account_name',
      p_contract->>'customer_display_name',
      coalesce((p_contract->>'created_at')::timestamptz, now())
    )
    returning id into v_contract_id;
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'CONTRACT_EXISTS', 'message', '合同号已存在，请更换合同号或使用上传附件');
  end;

  insert into public.contract_versions(
    contract_id, version_no, is_current, contract_date, company_name, created_at,
    tax_number, address, bank_name, bank_account, bank_mfo, bank_swift, oked_code,
    director_name, producer, change_reason
  ) values (
    v_contract_id,
    coalesce((p_version->>'version_no')::integer, 1),
    coalesce((p_version->>'is_current')::boolean, true),
    (p_version->>'contract_date')::date,
    p_version->>'company_name',
    coalesce((p_version->>'created_at')::timestamptz, now()),
    p_version->>'tax_number',
    p_version->>'address',
    p_version->>'bank_name',
    p_version->>'bank_account',
    p_version->>'bank_mfo',
    p_version->>'bank_swift',
    p_version->>'oked_code',
    p_version->>'director_name',
    p_version->>'producer',
    p_version->>'change_reason'
  ) returning id into v_version_id;

  insert into public.contract_attachments(
    contract_id, contract_version_id, attachment_type, logical_name, file_name,
    file_path, file_ext, is_current, source, remark, attachment_date, attachment_no, created_at
  )
  select
    v_contract_id,
    v_version_id,
    x.attachment_type,
    x.logical_name,
    x.file_name,
    x.file_path,
    x.file_ext,
    coalesce(x.is_current, true),
    coalesce(x.source, 'manual'),
    x.remark,
    x.attachment_date,
    x.attachment_no,
    coalesce(x.created_at, now())
  from jsonb_to_recordset(coalesce(p_files, '[]'::jsonb)) as x(
    attachment_type text,
    logical_name text,
    file_name text,
    file_path text,
    file_ext text,
    is_current boolean,
    source text,
    remark text,
    attachment_date date,
    attachment_no text,
    created_at timestamptz
  );

  v_resp := jsonb_build_object('ok', true, 'code', 'SUCCESS', 'message', '合同创建成功', 'contract_id', v_contract_id);
  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    insert into public.api_idempotency_keys(scope, request_id, response)
    values ('contract_create', p_request_id, v_resp)
    on conflict (scope, request_id) do update set response = excluded.response;
  end if;

  return v_resp;
end;
$$;

create or replace function public.rpc_attach_contract_files_txn(
  p_request_id text,
  p_contract_id uuid,
  p_files jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing jsonb;
  v_version_id uuid;
  v_resp jsonb;
begin
  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    select response into v_existing
    from public.api_idempotency_keys
    where scope = 'contract_attach' and request_id = p_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select id into v_version_id
  from public.contract_versions
  where contract_id = p_contract_id and is_current = true
  order by version_no desc
  limit 1;

  if v_version_id is null then
    return jsonb_build_object('ok', false, 'code', 'CONTRACT_VERSION_NOT_FOUND', 'message', '合同当前版本不存在');
  end if;

  insert into public.contract_attachments(
    contract_id, contract_version_id, attachment_type, logical_name, file_name,
    file_path, file_ext, is_current, source, remark, attachment_date, attachment_no, created_at
  )
  select
    p_contract_id,
    v_version_id,
    x.attachment_type,
    x.logical_name,
    x.file_name,
    x.file_path,
    x.file_ext,
    coalesce(x.is_current, true),
    coalesce(x.source, 'manual'),
    x.remark,
    x.attachment_date,
    x.attachment_no,
    coalesce(x.created_at, now())
  from jsonb_to_recordset(coalesce(p_files, '[]'::jsonb)) as x(
    attachment_type text,
    logical_name text,
    file_name text,
    file_path text,
    file_ext text,
    is_current boolean,
    source text,
    remark text,
    attachment_date date,
    attachment_no text,
    created_at timestamptz
  );

  v_resp := jsonb_build_object('ok', true, 'code', 'SUCCESS', 'message', '附件写入成功');
  if p_request_id is not null and length(trim(p_request_id)) > 0 then
    insert into public.api_idempotency_keys(scope, request_id, response)
    values ('contract_attach', p_request_id, v_resp)
    on conflict (scope, request_id) do update set response = excluded.response;
  end if;

  return v_resp;
end;
$$;
