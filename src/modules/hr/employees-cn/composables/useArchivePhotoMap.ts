import { ref } from 'vue';
import { getSignedUrl } from '../api';
import type { CnEmployeeWithStatus } from '../types';

export function useArchivePhotoMap() {
  const photoUrlMap = ref<Record<string, string>>({});

  async function loadListPhotoUrls(list: CnEmployeeWithStatus[]) {
    const map: Record<string, string> = {};
    const withPhoto = list.filter((e) => e.photo_url);
    await Promise.all(
      withPhoto.map(async (e) => {
        try {
          map[e.id] = await getSignedUrl(e.photo_url!);
        } catch {
          /* ignore */
        }
      })
    );
    photoUrlMap.value = { ...photoUrlMap.value, ...map };
  }

  async function loadSinglePhoto(id: string, photoUrl: string) {
    try {
      const url = await getSignedUrl(photoUrl);
      photoUrlMap.value = { ...photoUrlMap.value, [id]: url };
    } catch {
      /* ignore */
    }
  }

  return {
    photoUrlMap,
    loadListPhotoUrls,
    loadSinglePhoto,
  };
}
