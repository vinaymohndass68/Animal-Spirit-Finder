
import React, { useState, useCallback } from 'react';
import { identifyAnimal, generateSideBySideImage, animateImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import ImageCropper from './components/ImageCropper';

type ImageItemState = 'CROPPING' | 'IDENTIFYING' | 'RESULT' | 'GENERATING' | 'FINAL' | 'ANIMATING' | 'ANIMATED' | 'ERROR';

interface Analysis {
  animalName: string;
  justification: string;
}

interface ImageItem {
  id: string;
  previewUrl: string;
  originalPreviewUrl: string;
  base64: string;
  mimeType: string;
  state: ImageItemState;
  analysis: Analysis | null;
  error: string | null;
  environment: string;
  mood: string;
  style: string;
  aspectRatio: string;
  generatedImage: string | null;
  generatedVideo: string | null;
}


// --- UI Components ---

const LoadingOverlay: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
        <Spinner />
        <p className="text-lg text-center text-gray-300 mt-4 font-medium px-2">{text}</p>
    </div>
);

const environmentOptions = [
  { label: "Serene Nature (Default)", value: "a serene, beautiful natural environment like a forest path at sunrise or a misty meadow" },
  { label: "Ancient Forest", value: "an ancient, moss-covered forest with shafts of light filtering through the canopy" },
  { label: "Vibrant Jungle", value: "a vibrant, lush jungle teeming with exotic plants and waterfalls" },
  { label: "Snowy Mountain Peak", value: "a majestic, snowy mountain peak under a clear, starry sky" },
  { label: "Cosmic Nebula", value: "a surreal, colorful cosmic nebula with floating glowing particles" },
  { label: "Underwater Grotto", value: "a tranquil, bioluminescent underwater grotto" },
];

const moodOptions = [
  { label: "Inspiring (Default)", value: "inspiring and harmonious" },
  { label: "Mystical", value: "mystical and enchanting" },
  { label: "Playful", value: "playful and joyous" },
  { label: "Majestic", value: "majestic and powerful" },
  { label: "Adventurous", value: "adventurous and epic" },
  { label: "Dreamlike", value: "dreamlike and surreal" },
];

const styleOptions = [
  { label: "Photorealistic (Default)", value: "photorealistic, cinematic style" },
  { label: "Oil Painting", value: "lush, vibrant oil painting style with visible brushstrokes" },
  { label: "Watercolor", value: "soft, delicate watercolor painting style with gentle color bleeding" },
  { label: "Anime Art", value: "vibrant, dynamic anime art style with sharp lines and cel-shading" },
  { label: "Vintage Comic Book", value: "vintage comic book style with halftone dots and bold inks" },
  { label: "Digital Fantasy Art", value: "detailed digital fantasy art style, similar to concept art for a video game" },
];

const aspectRatioOptions = [
    { label: "Square (1:1)", value: "1:1" },
    { label: "Portrait (9:16)", value: "9:16" },
    { label: "Landscape (16:9)", value: "16:9" },
];


const CustomSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
}> = ({ id, label, value, onChange, options }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 text-sm"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);


const App: React.FC = () => {
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);

  const updateImageItem = (id: string, updates: Partial<ImageItem>) => {
    setImageItems(prevItems =>
      prevItems.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };
  
  const runIdentification = useCallback(async (item: ImageItem) => {
    try {
        updateImageItem(item.id, { state: 'IDENTIFYING', error: null });
        const analysis = await identifyAnimal(item.base64, item.mimeType);
        updateImageItem(item.id, { analysis, state: 'RESULT' });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        updateImageItem(item.id, { error: message, state: 'ERROR' });
    }
  }, []);

  const handleImageUpload = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      const id = `${Date.now()}-${file.name}`;

      reader.onloadend = () => {
          const result = reader.result as string;
          const base64String = result.split(',')[1];
          const newItem: ImageItem = {
            id,
            previewUrl: result,
            originalPreviewUrl: result,
            base64: base64String,
            mimeType: file.type,
            state: 'CROPPING',
            analysis: null,
            error: null,
            environment: 'a serene, beautiful natural environment like a forest path at sunrise or a misty meadow',
            mood: 'inspiring and harmonious',
            style: 'photorealistic, cinematic style',
            aspectRatio: '1:1',
            generatedImage: null,
            generatedVideo: null,
          };
          
          setImageItems(prev => [...prev, newItem]);
      };
       reader.onerror = () => {
          const newItem: ImageItem = {
            id,
            previewUrl: '',
            originalPreviewUrl: '',
            base64: '',
            mimeType: file.type,
            state: 'ERROR',
            analysis: null,
            error: "Failed to read the image file.",
            environment: '', mood: '', generatedImage: null, generatedVideo: null,
            style: '', aspectRatio: '',
          };
          setImageItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleCropComplete = useCallback((id: string, croppedBase64: string) => {
    const base64Data = croppedBase64.split(',')[1];
    const item = imageItems.find(i => i.id === id);
    if (!item) return;

    const updatedItem = { ...item, previewUrl: croppedBase64, base64: base64Data, state: 'IDENTIFYING' as ImageItemState };
    updateImageItem(id, { previewUrl: croppedBase64, base64: base64Data });
    runIdentification(updatedItem);
  }, [imageItems, runIdentification]);

  const handleSkipCrop = useCallback((id: string) => {
    const item = imageItems.find(i => i.id === id);
    if (!item) return;
    runIdentification(item);
  }, [imageItems, runIdentification]);

  const handleGenerateClick = useCallback(async (id: string) => {
    const item = imageItems.find(i => i.id === id);
    if (!item || !item.base64 || !item.mimeType || !item.analysis?.animalName) return;

    updateImageItem(id, { state: 'GENERATING', error: null });
    
    try {
      const newImage = await generateSideBySideImage(item.base64, item.mimeType, item.analysis.animalName, item.environment, item.mood, item.style, item.aspectRatio);
      updateImageItem(id, { generatedImage: newImage, state: 'FINAL' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      updateImageItem(id, { error: message, state: 'ERROR' });
    }
  }, [imageItems]);

  const handleAnimateClick = useCallback(async (id: string) => {
    const item = imageItems.find(i => i.id === id);
    if (!item || !item.generatedImage) return;

    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
    }

    updateImageItem(id, { state: 'ANIMATING', error: null });
    
    try {
      const videoUrl = await animateImage(item.generatedImage, 'image/png', item.aspectRatio as '1:1' | '9:16' | '16:9');
      updateImageItem(id, { generatedVideo: videoUrl, state: 'ANIMATED' });
    } catch (e: any) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      updateImageItem(id, { error: message, state: 'ERROR' });
      
       // Handle specific permission issues requiring a new key selection
       if (message.includes("PERMISSION_REQUIRED") || message.includes("Requested entity was not found")) {
          await (window as any).aistudio.openSelectKey();
       }
    }
  }, [imageItems]);

  const handleStartOver = () => {
    setImageItems([]);
  };
  
  const handleSaveImage = (id: string) => {
    const item = imageItems.find(i => i.id === id);
    if (!item || !item.generatedImage || !item.analysis) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${item.generatedImage}`;
    link.download = `spirit-animal-${item.analysis.animalName.toLowerCase().replace(' ','-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveVideo = async (id:string) => {
    const item = imageItems.find(i => i.id === id);
    if (!item || !item.generatedVideo || !item.analysis) return;
    
    try {
        const response = await fetch(item.generatedVideo);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `spirit-animal-animation-${item.analysis.animalName.toLowerCase().replace(/\s+/g, '-')}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to save video:", error);
        const message = error instanceof Error ? error.message : "Could not download the video file.";
        updateImageItem(id, { error: message, state: 'ERROR' });
    }
  };
  
  const handleRemoveItem = (id: string) => {
      setImageItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleRetry = (id: string) => {
     const item = imageItems.find(i => i.id === id);
     if (!item) return;

     if (item.generatedImage && (item.state === 'ERROR' || item.state === 'FINAL')) {
        handleAnimateClick(id);
     } else if (item.analysis) {
        handleGenerateClick(id);
     } else {
        runIdentification(item);
     }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
       <header className="w-full max-w-6xl mx-auto text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
          Find Your Spirit Animal
        </h1>
        <p className="text-lg text-gray-400">
          Upload a photo to discover your animal likeness, then bring your shared spirit to life.
        </p>
      </header>

      <main className="w-full max-w-6xl mx-auto">
        {imageItems.length === 0 ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {imageItems.map(item => (
                 <div key={item.id} className="relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 shadow-lg flex flex-col">
                  {/* Loading overlays */}
                  {item.state === 'IDENTIFYING' && <LoadingOverlay text="Finding your spirit animal..." />}
                  {item.state === 'GENERATING' && <LoadingOverlay text="Creating your shared world..." />}
                  {item.state === 'ANIMATING' && <LoadingOverlay text="Bringing your image to life..." />}
              
                  {/* Main content */}
                  <div className="flex-grow flex flex-col">
                    {/* Image/Video/Cropper Display */}
                    <div className="aspect-square w-full bg-gray-900 border-b border-gray-700 overflow-hidden relative">
                      {item.state === 'CROPPING' ? (
                        <ImageCropper 
                          image={item.originalPreviewUrl} 
                          onCropComplete={(base64) => handleCropComplete(item.id, base64)}
                          onSkip={() => handleSkipCrop(item.id)}
                        />
                      ) : item.state === 'ANIMATED' && item.generatedVideo ? (
                        <video src={item.generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
                      ) : item.generatedImage ? (
                        <img src={`data:image/png;base64,${item.generatedImage}`} alt="Generated spirit animal" className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.previewUrl} alt="User upload" className="w-full h-full object-cover" />
                      )}
                    </div>
              
                    {/* State-dependent content */}
                    <div className="p-4 flex-grow">
                      {item.analysis && (item.state === 'RESULT' || item.state === 'GENERATING' || item.state === 'FINAL' || item.state === 'ANIMATING' || item.state === 'ANIMATED') && (
                        <div className="text-center mb-4">
                          <h3 className="text-2xl font-bold text-indigo-400">{item.analysis.animalName}</h3>
                          <p className="text-gray-300 italic text-sm">"{item.analysis.justification}"</p>
                        </div>
                      )}
              
                      {item.state === 'RESULT' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 gap-4">
                                <CustomSelect id={`style-${item.id}`} label="Artistic Style" value={item.style} onChange={(e) => updateImageItem(item.id, { style: e.target.value })} options={styleOptions} />
                                <div className="grid grid-cols-2 gap-2">
                                  <CustomSelect id={`aspectRatio-${item.id}`} label="Aspect Ratio" value={item.aspectRatio} onChange={(e) => updateImageItem(item.id, { aspectRatio: e.target.value })} options={aspectRatioOptions} />
                                  <CustomSelect id={`mood-${item.id}`} label="Mood" value={item.mood} onChange={(e) => updateImageItem(item.id, { mood: e.target.value })} options={moodOptions} />
                                </div>
                                <CustomSelect id={`environment-${item.id}`} label="Environment" value={item.environment} onChange={(e) => updateImageItem(item.id, { environment: e.target.value })} options={environmentOptions} />
                            </div>
                        </div>
                      )}
              
                      {item.state === 'ERROR' && item.error && (
                          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center flex flex-col gap-2">
                              <p className="font-bold">An Error Occurred</p>
                              <p className="text-xs">{item.error}</p>
                              {item.error.includes("PERMISSION_REQUIRED") && (
                                <a 
                                  href="https://ai.google.dev/gemini-api/docs/billing" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-300 underline hover:text-indigo-200 mt-2"
                                >
                                  View Billing Documentation
                                </a>
                              )}
                          </div>
                      )}
                    </div>
                  </div>
              
                  {/* Footer with actions */}
                  {item.state !== 'CROPPING' && (
                    <div className="bg-gray-800 p-4 border-t border-gray-700 mt-auto">
                        <div className="flex flex-col gap-2">
                        {item.state === 'RESULT' && (
                            <button onClick={() => handleGenerateClick(item.id)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Generate Image</button>
                        )}
                        {item.state === 'FINAL' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleAnimateClick(item.id)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Animate</button>
                              <button onClick={() => handleSaveImage(item.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Save</button>
                            </div>
                        )}
                        {item.state === 'ANIMATED' && (
                            <button onClick={() => handleSaveVideo(item.id)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Video</button>
                        )}
                        {item.state === 'ERROR' && (
                            <button onClick={() => handleRetry(item.id)} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Retry</button>
                        )}
                        <button onClick={() => handleRemoveItem(item.id)} className="w-full bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">Remove</button>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
                <button
                    onClick={handleStartOver}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Start Over
                </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
