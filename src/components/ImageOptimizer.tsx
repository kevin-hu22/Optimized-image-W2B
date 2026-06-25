import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  FileImage,
  Settings2,
  Trash2,
  FileArchive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { cn } from '../lib/utils';

type ImageFormat = 'webp' | 'avif' | 'png' | 'jpeg';

interface ImageState {
  file: File;
  preview: string;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  originalSize: number;
  optimizedSize?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  optimizedBlob?: Blob;
  optimizedUrl?: string;
}

export default function ImageOptimizer() {
  const [images, setImages] = useState<ImageState[]>([]);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('webp');
  const [quality, setQuality] = useState(0.8);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const newImages = await Promise.all(
      files.map(async (file) => {
        return new Promise<ImageState>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                file,
                preview: e.target?.result as string,
                originalWidth: img.width,
                originalHeight: img.height,
                optimizedWidth: img.width,
                optimizedHeight: img.height,
                originalSize: file.size,
                status: 'idle'
              });
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      })
    );
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index].optimizedUrl) {
        URL.revokeObjectURL(newImages[index].optimizedUrl!);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const updateDimensions = (index: number, width?: number, height?: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      const img = newImages[index];
      
      if (width !== undefined) {
        img.optimizedWidth = width;
        if (maintainAspectRatio) {
          img.optimizedHeight = Math.round((width / img.originalWidth) * img.originalHeight);
        }
      } else if (height !== undefined) {
        img.optimizedHeight = height;
        if (maintainAspectRatio) {
          img.optimizedWidth = Math.round((height / img.originalHeight) * img.originalWidth);
        }
      }
      
      return newImages;
    });
  };

  const optimizeImage = async (index: number) => {
    const imgState = images[index];
    setImages((prev) => {
      const next = [...prev];
      next[index].status = 'processing';
      return next;
    });

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgState.preview;
      });

      canvas.width = imgState.optimizedWidth;
      canvas.height = imgState.optimizedHeight;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const mimeType = `image/${targetFormat}`;
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), mimeType, quality);
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          setImages((prev) => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              status: 'done',
              optimizedBlob: blob,
              optimizedUrl: url,
              optimizedSize: blob.size
            };
            return next;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setImages((prev) => {
        const next = [...prev];
        next[index].status = 'error';
        return next;
      });
    }
  };

  const optimizeAll = async () => {
    for (let i = 0; i < images.length; i++) {
      if (images[i].status !== 'done') {
        await optimizeImage(i);
      }
    }
  };

  const downloadImage = (img: ImageState) => {
    if (!img.optimizedUrl) return;
    const a = document.createElement('a');
    const extension = targetFormat;
    const originalName = img.file.name.split('.').slice(0, -1).join('.');
    a.href = img.optimizedUrl;
    a.download = `${originalName}-optimized.${extension}`;
    a.click();
  };

  const downloadAllAsZip = async () => {
    const optimizedImages = images.filter(img => img.status === 'done' && img.optimizedBlob);
    if (optimizedImages.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();
    
    optimizedImages.forEach((img) => {
      const extension = targetFormat;
      const originalName = img.file.name.split('.').slice(0, -1).join('.');
      const fileName = `${originalName}-optimized.${extension}`;
      zip.file(fileName, img.optimizedBlob!);
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-images-${new Date().getTime()}.zip`;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Controls Panel */}
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Configuración</h2>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Formato de Salida</label>
              <div className="grid grid-cols-2 gap-2">
                {(['webp', 'avif', 'png', 'jpeg'] as ImageFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTargetFormat(f)}
                    className={cn(
                      "py-2 px-4 rounded-xl text-sm font-medium transition-all border",
                      targetFormat === f 
                        ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm" 
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-gray-400 uppercase">Calidad</label>
                <span className="text-sm font-mono font-bold text-orange-500">{Math.round(quality * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.05" 
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Aspect Ratio Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-600">Mantener Proporción</span>
              <button 
                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  maintainAspectRatio ? "bg-orange-500" : "bg-gray-300"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                  maintainAspectRatio ? "left-6" : "left-1"
                )} />
              </button>
            </div>

            <button 
              onClick={optimizeAll}
              disabled={images.length === 0}
              className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10"
            >
              <RefreshCw className="w-5 h-5" />
              Optimizar Todo
            </button>

            {images.length > 1 && images.some(img => img.status === 'done') && (
              <button 
                onClick={downloadAllAsZip}
                disabled={isZipping}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 shadow-xl shadow-orange-500/10"
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
          className="group relative bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="text-orange-500 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-1">Suelta tus imágenes aquí</h3>
          <p className="text-gray-400 text-sm">o haz clic para seleccionar archivos</p>
        </div>

        {/* Images List */}
        <div className="space-y-4">
          <AnimatePresence>
            {images.map((img, idx) => (
              <motion.div
                key={`${img.file.name}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                {/* Preview */}
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                  <img src={img.preview} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                {/* Info & Controls */}
                <div className="flex-grow space-y-3 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm truncate max-w-[200px]">{img.file.name}</h4>
                      <p className="text-xs text-gray-400 font-mono">{formatSize(img.originalSize)} • {img.originalWidth}x{img.originalHeight}</p>
                    </div>
                    <button 
                      onClick={() => removeImage(idx)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ancho</label>
                      <input 
                        type="number" 
                        value={img.optimizedWidth}
                        onChange={(e) => updateDimensions(idx, parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-orange-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Alto</label>
                      <input 
                        type="number" 
                        value={img.optimizedHeight}
                        onChange={(e) => updateDimensions(idx, undefined, parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-orange-300"
                      />
                    </div>
                    
                    <div className="col-span-2 flex items-end gap-2">
                      {img.status === 'done' ? (
                        <div className="flex-grow bg-green-50 text-green-600 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-between border border-green-100">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>-{Math.round((1 - (img.optimizedSize! / img.originalSize)) * 100)}%</span>
                          </div>
                          <span className="font-mono">{formatSize(img.optimizedSize!)}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => optimizeImage(idx)}
                          disabled={img.status === 'processing'}
                          className="flex-grow bg-orange-500 text-white rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          {img.status === 'processing' ? 'Procesando...' : 'Optimizar'}
                        </button>
                      )}
                      
                      {img.status === 'done' && (
                        <button 
                          onClick={() => downloadImage(img)}
                          className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {images.length === 0 && (
            <div className="text-center py-12 text-gray-300">
              <FileImage className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No hay imágenes en la cola</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
