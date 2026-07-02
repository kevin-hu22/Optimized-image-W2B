import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  FileVideo,
  Settings2,
  Trash2,
  FileArchive,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { cn } from '../lib/utils';

type VideoFormat = 'mp4' | 'webm';

interface VideoState {
  file: File;
  previewUrl: string;
  originalSize: number;
  optimizedSize?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  optimizedBlob?: Blob;
  optimizedUrl?: string;
}

export default function VideoOptimizer() {
  const [videos, setVideos] = useState<VideoState[]>([]);
  const [targetFormat, setTargetFormat] = useState<VideoFormat>('mp4');
  const [crf, setCrf] = useState(28); // Lower is better quality, higher is smaller size
  const [isZipping, setIsZipping] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    loadFfmpeg();
  }, []);

  const loadFfmpeg = async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setFfmpegLoaded(true);
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const newVideos: VideoState[] = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      status: 'idle',
      progress: 0
    }));
    setVideos(prev => [...prev, ...newVideos]);
  };

  const removeVideo = (index: number) => {
    setVideos(prev => {
      const newVideos = [...prev];
      if (newVideos[index].previewUrl) URL.revokeObjectURL(newVideos[index].previewUrl);
      if (newVideos[index].optimizedUrl) URL.revokeObjectURL(newVideos[index].optimizedUrl!);
      newVideos.splice(index, 1);
      return newVideos;
    });
  };

  const optimizeVideo = async (index: number) => {
    if (!ffmpegLoaded) return;
    
    const video = videos[index];
    const ffmpeg = ffmpegRef.current;
    
    setVideos(prev => {
      const next = [...prev];
      next[index].status = 'processing';
      next[index].progress = 0;
      return next;
    });

    try {
      ffmpeg.on('progress', ({ progress, time }) => {
        setVideos(prev => {
          const next = [...prev];
          next[index].progress = Math.round(progress * 100);
          return next;
        });
      });

      const inputName = `input_${index}.${video.file.name.split('.').pop()}`;
      const outputName = `output_${index}.${targetFormat}`;

      await ffmpeg.writeFile(inputName, await fetchFile(video.file));

      // Compression settings:
      // -vcodec libx264 for mp4, libvpx-vp9 for webm
      // -crf (Constant Rate Factor) controls quality/size. 23 is default for x264, we use user selected
      // -preset fast for reasonable encoding speed
      
      const args = ['-i', inputName];
      if (targetFormat === 'mp4') {
        args.push('-vcodec', 'libx264', '-crf', crf.toString(), '-preset', 'fast');
      } else {
        args.push('-vcodec', 'libvpx-vp9', '-crf', crf.toString(), '-b:v', '0');
      }
      args.push(outputName);

      await ffmpeg.exec(args);

      const fileData = await ffmpeg.readFile(outputName);
      const data = new Uint8Array(fileData as ArrayBuffer);
      
      const blob = new Blob([data.buffer], { type: `video/${targetFormat}` });
      const url = URL.createObjectURL(blob);

      setVideos(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: 'done',
          progress: 100,
          optimizedBlob: blob,
          optimizedUrl: url,
          optimizedSize: blob.size
        };
        return next;
      });
      
      // Cleanup virtual files
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

    } catch (error) {
      console.error(error);
      setVideos(prev => {
        const next = [...prev];
        next[index].status = 'error';
        return next;
      });
    }
  };

  const optimizeAll = async () => {
    for (let i = 0; i < videos.length; i++) {
      if (videos[i].status !== 'done') {
        await optimizeVideo(i);
      }
    }
  };

  const downloadVideo = (vid: VideoState) => {
    if (!vid.optimizedUrl) return;
    const a = document.createElement('a');
    const extension = targetFormat;
    const originalName = vid.file.name.split('.').slice(0, -1).join('.');
    a.href = vid.optimizedUrl;
    a.download = `${originalName}.${extension}`;
    a.click();
  };

  const downloadAllAsZip = async () => {
    const optimizedVideos = videos.filter(vid => vid.status === 'done' && vid.optimizedBlob);
    if (optimizedVideos.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();
    
    optimizedVideos.forEach((vid) => {
      const extension = targetFormat;
      const originalName = vid.file.name.split('.').slice(0, -1).join('.');
      const fileName = `${originalName}.${extension}`;
      zip.file(fileName, vid.optimizedBlob!);
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-videos-${new Date().getTime()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ZIP:', error);
    } finally {
      setIsZipping(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!ffmpegLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-500" />
        <p className="font-medium text-gray-600">Cargando motor de compresión de video...</p>
        <p className="text-sm mt-2 max-w-md text-center">Esto solo tomará unos segundos y descarga los recursos necesarios para procesar localmente.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Controls Panel */}
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Configuración</h2>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Formato de Salida</label>
              <div className="grid grid-cols-2 gap-2">
                {(['mp4', 'webm'] as VideoFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTargetFormat(f)}
                    className={cn(
                      "py-2 px-4 rounded-xl text-sm font-medium transition-all border",
                      targetFormat === f 
                        ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality (CRF) Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Compresión</label>
                <span className="text-sm font-mono font-bold text-blue-500">
                  {crf < 23 ? 'Alta Calidad' : crf > 35 ? 'Tamaño Pequeño' : 'Equilibrado'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Menor valor = Mayor calidad / Mayor peso</p>
              <input 
                type="range" 
                min="18" 
                max="51" 
                step="1" 
                value={crf}
                onChange={(e) => setCrf(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                <span>Calidad</span>
                <span>Compresión</span>
              </div>
            </div>

            <button 
              onClick={optimizeAll}
              disabled={videos.length === 0}
              className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10"
            >
              <RefreshCw className="w-5 h-5" />
              Comprimir Todo
            </button>

            {videos.length > 1 && videos.some(vid => vid.status === 'done') && (
              <button 
                onClick={downloadAllAsZip}
                disabled={isZipping}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/10"
              >
                {isZipping ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FileArchive className="w-5 h-5" />
                )}
                Descargar ZIP
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-8 space-y-6">
        {/* Dropzone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            processFiles(Array.from(e.dataTransfer.files) as File[]);
          }}
          className="group relative bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            accept="video/*" 
            className="hidden" 
          />
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="text-blue-500 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-1">Suelta tus videos aquí</h3>
          <p className="text-gray-400 text-sm">o haz clic para seleccionar archivos</p>
        </div>

        {/* Videos List */}
        <div className="space-y-4">
          <AnimatePresence>
            {videos.map((vid, idx) => (
              <motion.div
                key={`${vid.file.name}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                {/* Preview */}
                <div className="w-32 h-24 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-gray-100 relative group">
                  <video src={vid.previewUrl} className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <FileVideo className="text-white w-6 h-6" />
                  </div>
                </div>

                {/* Info & Controls */}
                <div className="flex-grow space-y-3 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm truncate max-w-[250px]">{vid.file.name}</h4>
                      <p className="text-xs text-gray-400 font-mono">{formatSize(vid.originalSize)}</p>
                    </div>
                    <button 
                      onClick={() => removeVideo(idx)}
                      disabled={vid.status === 'processing'}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end gap-2">
                    {vid.status === 'done' ? (
                      <div className="flex-grow bg-green-50 text-green-600 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-between border border-green-100">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>-{Math.round((1 - (vid.optimizedSize! / vid.originalSize)) * 100)}%</span>
                        </div>
                        <span className="font-mono">{formatSize(vid.optimizedSize!)}</span>
                      </div>
                    ) : (
                      <div className="flex-grow relative">
                        {vid.status === 'processing' ? (
                          <div className="bg-gray-50 border border-gray-100 rounded-lg h-9 flex items-center px-3 overflow-hidden relative">
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-300"
                              style={{ width: `${vid.progress}%` }}
                            />
                            <span className="text-xs font-bold text-blue-600 z-10 w-full text-center">
                              Comprimiendo... {vid.progress}%
                            </span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => optimizeVideo(idx)}
                            className="w-full bg-blue-500 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-blue-600 transition-colors"
                          >
                            Comprimir
                          </button>
                        )}
                      </div>
                    )}
                    
                    {vid.status === 'done' && (
                      <button 
                        onClick={() => downloadVideo(vid)}
                        className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {videos.length === 0 && (
            <div className="text-center py-12 text-gray-300">
              <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No hay videos en la cola</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
