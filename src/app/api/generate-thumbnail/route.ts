// src/app/api/generate-thumbnail/route.ts

export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";

// Supabase admin‐klienst service‐role kulccsal
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  let videoPath: string, videoId: string;

  // 1) Body parse
  try {
    ({ videoPath, videoId } = (await request.json()) as {
      videoPath: string;
      videoId: string;
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!videoPath || !videoId) {
    return NextResponse.json({ error: "Missing videoPath or videoId" }, { status: 400 });
  }

  try {
    // 2) Videó letöltése a storage‐ból
    const { data: download, error: dlError } = await supabaseAdmin
      .storage
      .from("videos")
      .download(videoPath);
    if (dlError || !download) throw dlError || new Error("Download failed");

    const tmpVideo = path.join(os.tmpdir(), path.basename(videoPath));
    const bufVideo = Buffer.from(await download.arrayBuffer());
    fs.writeFileSync(tmpVideo, bufVideo);

    // 3) FFmpeg a PATH‐ból
    console.log("▶️ Using system ffmpeg from PATH");
    ffmpeg.setFfmpegPath("C:\\tools\\ffmpeg\\bin\\ffmpeg.exe");

    // 4) Thumbnail generálása
    const tmpThumb = path.join(os.tmpdir(), `${videoId}.jpg`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpVideo)
        .screenshots({
          timestamps: ["1"],
          filename: path.basename(tmpThumb),
          folder: path.dirname(tmpThumb),
          size: "320x240",
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // 5) Feltöltés a thumbnails bucket‐be (bufferrel, már nem stream)
    const thumbPath = `thumbs/${videoId}.jpg`;
    const thumbBuffer = fs.readFileSync(tmpThumb);
    const { data: upData, error: upErr } = await supabaseAdmin
      .storage
      .from("thumbnails")
      .upload(thumbPath, thumbBuffer, {
        cacheControl: "3600",
        upsert: true,
      });
    if (upErr || !upData) throw upErr || new Error("Thumbnail upload failed");

    // 6) Publikus URL
    const {
      data: { publicUrl },
    } = supabaseAdmin
      .storage
      .from("thumbnails")
      .getPublicUrl(thumbPath);

    // 7) DB update
    const { error: dbErr } = await supabaseAdmin
      .from("videos")
      .update({ thumbnail_url: publicUrl })
      .eq("id", videoId);
    if (dbErr) throw dbErr;

    // 8) Cleanup
    fs.unlinkSync(tmpVideo);
    fs.unlinkSync(tmpThumb);

    return NextResponse.json({ publicUrl });
  } catch (err: unknown) {
    console.error("🔴 Thumbnail error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json(
      { error: message, stack: err instanceof Error ? err.stack : null },
      { status: 500 }
    );
  }
}
