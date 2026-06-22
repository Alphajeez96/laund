import fs from "node:fs";
import path from "node:path";
import type {MediaType} from "../types";
import {requestAppJson} from "@/utils/catch-async";

export const uploadMedia = async ({
  appId,
  filePath,
  mediaType,
}: {
  appId: string;
  filePath: string;
  mediaType: MediaType;
}): Promise<string> => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("file", blob, path.basename(filePath));

  const response = await requestAppJson<{mediaId?: string}>(
    appId,
    `app/${appId}/v3/media/upload`,
    {
      method: "POST",
      body: formData,
      context: "upload media",
    },
  );

  return response?.mediaId ?? "";
};
