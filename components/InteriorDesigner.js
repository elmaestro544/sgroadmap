import React, { useState, useRef } from 'react';
import { i18n, DESIGN_STYLES } from '../constants';
import * as geminiService from '../services/geminiService';
import { Spinner, DownloadIcon, UploadIcon } from './Shared';

const InteriorDesigner = ({ language }) => {
  const t = i18n[language];
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [roomType, setRoomType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setGeneratedImage(null); // Reset on new image upload
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragEvents = (e, over) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(over);
  };

  const handleDrop = (e) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };
  
  const handleRedesign = async () => {
    if (!imageFile || !roomType || !selectedStyle) return;
    setIsLoading(true);
    setGeneratedImage(null);
    try {
        const result = await geminiService.redesignImage(imageFile, roomType, selectedStyle.id);
        setGeneratedImage(result);
    } catch (error) {
        console.error("Error redesigning image:", error);
        alert(t.errorOccurred);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `scigenius-design-${selectedStyle?.id.toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      {isLoading && (
          <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col justify-center items-center backdrop-blur-sm">
              <Spinner size="12" />
              <p className="text-xl text-white mt-4">{t.redesigning}</p>
          </div>
      )}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-text">{t.designTitle}</h2>
        <p className="text-brand-text-light mt-2">{t.designDescription}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Upload */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-brand-red">{t.step1}</h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            className={`aspect-video rounded-xl flex flex-col items-center justify-center border-2 border-dashed transition-colors cursor-pointer ${isDragOver ? 'border-brand-blue bg-brand-light-dark' : 'bg-brand-light-dark/50 border-white/20 hover:border-white/40'}`}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Room preview" className="object-contain h-full w-full rounded-lg" />
            ) : (
              <>
                <UploadIcon />
                <span className="mt-4 text-brand-text-light text-center">{t.uploadArea}</span>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
        </div>
        
        {/* Step 2: Room Type */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-brand-red">{t.step2}</h3>
          <select 
            value={roomType} 
            onChange={(e) => setRoomType(e.target.value)} 
            className="w-full p-3 bg-brand-light-dark border border-white/20 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none"
          >
            <option value="">{t.selectRoomType}</option>
            {Object.entries(t.roomTypes).map(([key, value]) => (
                <option key={key} value={value}>{value}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Style */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-brand-red">{t.step3}</h3>
          <div className="grid grid-cols-3 gap-2">
            {DESIGN_STYLES.map(style => (
              <div
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${selectedStyle?.id === style.id ? 'ring-4 ring-brand-red scale-105 shadow-lg' : 'ring-2 ring-transparent hover:scale-105'}`}
              >
                <img src={style.imageUrl} alt={style.name(language)} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/50 flex items-end p-2">
                    <p className="text-white text-xs font-bold">{style.name(language)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={handleRedesign}
          disabled={!imageFile || !roomType || !selectedStyle || isLoading}
          className="bg-brand-red hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full text-lg transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
        >
          {t.redesign}
        </button>
      </div>

      {generatedImage && imagePreview && (
        <div className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                    <h3 className="text-2xl font-semibold mb-2">{t.before}</h3>
                    <img src={imagePreview} alt="Original room" className="rounded-lg w-full" />
                </div>
                <div className="text-center">
                    <h3 className="text-2xl font-semibold mb-2">{t.after}</h3>
                    <div className="relative">
                        <img src={generatedImage} alt="Redesigned room" className="rounded-lg w-full" />
                        <button
                            onClick={handleDownload}
                            className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} flex items-center bg-brand-blue hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-full transition-colors shadow-lg`}
                        >
                           <DownloadIcon /> {t.download}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InteriorDesigner;