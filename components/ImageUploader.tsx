
import React, { useCallback, useState } from 'react';
import { generatePersonImage } from '../services/geminiService';
import Spinner from './Spinner';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
}

const UploadIcon: React.FC = () => (
  <svg className="w-12 h-12 mx-auto text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v2.586l1.293-1.293a1 1 0 111.414 1.414L12.414 8l1.293 1.293a1 1 0 01-1.414 1.414L11 9.414V12a1 1 0 11-2 0V9.414l-1.293 1.293a1 1 0 01-1.414-1.414L7.586 8 6.293 6.707a1 1 0 011.414-1.414L9 6.586V4a1 1 0 011-1zM3 10a1 1 0 011-1h2.586l1.293-1.293a1 1 0 111.414 1.414L8 10.414l1.293 1.293a1 1 0 01-1.414 1.414L7.586 12H4a1 1 0 110-2zm14 0a1 1 0 01-1 1h-2.586l-1.293 1.293a1 1 0 01-1.414-1.414L12 10.414l-1.293-1.293a1 1 0 011.414-1.414L12.414 8H16a1 1 0 010 2zM10 17a1 1 0 01-1-1v-2.586l-1.293 1.293a1 1 0 01-1.414-1.414L7.586 12l-1.293-1.293a1 1 0 111.414-1.414L9 10.586V8a1 1 0 112 0v2.586l1.293-1.293a1 1 0 111.414 1.414L12.414 12l1.293 1.293a1 1 0 01-1.414 1.414L11 13.414V16a1 1 0 01-1 1z" clipRule="evenodd" />
    </svg>
);

type Tab = 'upload' | 'generate';

const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [prompt, setPrompt] = useState<string>('A photorealistic image of a woman with long, curly red hair, smiling warmly.');
  const [isGenerating, setIsGenerating] = useState<false>(false);
  const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(Array.from(e.target.files));
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLLabelElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImageUpload(Array.from(e.dataTransfer.files));
    }
  }, [onImageUpload, handleDragEvents]);

  const handleGenerate = async () => {
    setError(null);
    setGeneratedImage(null);
    setIsGenerating(true);
    try {
      const result = await generatePersonImage(prompt);
      setGeneratedImage(result);
    } catch(e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleUseImage = () => {
    if (!generatedImage) return;
    const file = base64ToFile(generatedImage.base64, 'generated-image.png', generatedImage.mimeType);
    onImageUpload([file]);
  };
  
  const handleTryAgain = () => {
    setGeneratedImage(null);
    setError(null);
  };

  const dragOverClass = isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600';

  return (
    <div className="w-full">
      <div className="mb-4 border-b border-gray-700 flex">
        <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Upload Files</button>
        <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'generate' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Generate with AI</button>
      </div>

      {activeTab === 'upload' && (
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="dropzone-file"
            className={`flex flex-col items-center justify-center w-full min-h-[16rem] h-auto border-2 ${dragOverClass} border-dashed rounded-lg cursor-pointer bg-gray-900/50 hover:bg-gray-800/60 transition-colors duration-300`}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon />
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, or WEBP (MAX. 10MB)</p>
            </div>
            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" multiple />
          </label>
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
              {error}
            </div>
          )}
          
          {!generatedImage && !isGenerating && (
             <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-300">Describe the person you want to create.</p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                    placeholder="e.g., An elderly man with a long white beard and kind eyes..."
                />
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 shadow-lg disabled:bg-gray-500 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    <SparklesIcon />
                    Generate Image
                </button>
             </div>
          )}

          {isGenerating && (
             <div className="w-full min-h-[16rem] flex flex-col items-center justify-center text-gray-400">
                <Spinner />
                <p className="mt-2">Creating your image...</p>
             </div>
          )}

          {generatedImage && !isGenerating && (
            <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-300">Here is your generated image:</p>
                <div className="w-full aspect-square rounded-lg overflow-hidden border border-gray-700">
                    <img src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`} alt="Generated person" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleUseImage} className="w-full sm:w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">Use this Image</button>
                    <button onClick={handleTryAgain} className="w-full sm:w-1/2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">Generate a New One</button>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
