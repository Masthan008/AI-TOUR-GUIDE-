import React, { useState, useEffect } from 'react';
import { generateImage, editImage, generateVideo } from './services/geminiService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AlertIcon, ImageIcon, SparklesIcon, UploadIcon } from './components/Icons';

type Tab = 'generate' | 'edit' | 'video';
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

const CreateStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [sourceImage, setSourceImage] = useState<{ url: string; file: File } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  useEffect(() => {
    if (activeTab === 'video') {
        window.aistudio.hasSelectedApiKey().then(setApiKeyReady);
    }
  }, [activeTab]);

  const handleSelectKey = async () => {
      await window.aistudio.openSelectKey();
      setApiKeyReady(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSourceImage({ url, file });
      setResult(null);
    }
  };
  
  const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (activeTab === 'generate') {
        setLoadingMessage('Generating your image...');
        const imageBytes = await generateImage(prompt, aspectRatio);
        setResult(`data:image/png;base64,${imageBytes}`);
      } else if (activeTab === 'edit' && sourceImage) {
        setLoadingMessage('Applying AI edits...');
        const base64Data = await getBase64(sourceImage.file);
        const editedImageBytes = await editImage(prompt, base64Data, sourceImage.file.type);
        setResult(`data:image/png;base64,${editedImageBytes}`);
      } else if (activeTab === 'video' && sourceImage) {
          const base64Data = await getBase64(sourceImage.file);
          const generator = generateVideo(prompt.trim() || undefined, base64Data, sourceImage.file.type, videoAspectRatio);
          for await (const message of generator) {
              if (message.startsWith('blob:')) {
                  setResult(message);
                  setLoadingMessage('Video generated!');
              } else {
                  setLoadingMessage(message);
              }
          }
      }
    } catch (err: any) {
        console.error(err);
        let errorMessage = err.message || 'An unexpected error occurred.';
        if (err.message.includes("Requested entity was not found")) {
            errorMessage = "API Key error. Please re-select your API key.";
            setApiKeyReady(false);
        }
        setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const renderTabs = () => (
    <div className="flex justify-center mb-6 border-b border-white/10">
      {(['generate', 'edit', 'video'] as Tab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
            activeTab === tab ? 'border-b-2 border-sky-400 text-sky-300' : 'text-gray-400 hover:text-white'
          }`}
        >
          {tab === 'video' ? 'Video' : `${tab} Image`}
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    const showImageUploader = activeTab === 'edit' || activeTab === 'video';
    const isPromptRequired = activeTab === 'generate' || activeTab === 'edit';
    const showPrompt = activeTab !== 'video' || (activeTab === 'video' && sourceImage);
    const showAspectRatio = activeTab === 'generate';
    const showVideoAspectRatio = activeTab === 'video' && sourceImage;

    if (activeTab === 'video' && !apiKeyReady) {
        return (
            <div className="text-center p-8 glass-pane">
                <h3 className="text-xl font-semibold mb-4">API Key Required for Video Generation</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">The Veo video generation model requires you to select your own API key. This helps manage resource allocation for this powerful feature.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:underline mb-6 block">Learn more about billing.</a>
                <button onClick={handleSelectKey} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">
                    Select API Key
                </button>
            </div>
        );
    }

    const isSubmitDisabled = isLoading || 
        (showImageUploader && !sourceImage) ||
        (isPromptRequired && !prompt.trim());

    return (
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
        {showImageUploader && (
          <div className="mb-4 w-full max-w-md">
            {sourceImage ? (
                <div className="flex flex-col items-center">
                    <img src={sourceImage.url} alt="Source" className="rounded-lg max-h-48 w-auto mb-2" />
                    <button type="button" onClick={() => { setSourceImage(null); setResult(null); }} className="text-sm text-sky-400 hover:underline">
                        Change Image
                    </button>
                </div>
            ) : (
                <label className="w-full cursor-pointer glass-pane p-8 flex flex-col items-center justify-center hover:border-sky-400 transition-colors">
                    <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-300">Upload an image</span>
                    <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
            )}
          </div>
        )}
        
        {showPrompt && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
                activeTab === 'generate' ? 'A futuristic city skyline at sunset...' : 
                activeTab === 'edit' ? 'Add a pirate hat to the person...' : 
                'Animate this image, making the clouds move...'
            }
            className="w-full max-w-md p-3 mb-4 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400 text-white"
            rows={3}
            required={isPromptRequired}
          />
        )}
        
        {showAspectRatio && (
          <div className="mb-4">
            <span className="text-sm text-gray-300 mr-3">Aspect Ratio:</span>
            {aspectRatios.map(ar => (
              <button
                type="button"
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-3 py-1 mr-2 text-xs rounded-full ${aspectRatio === ar ? 'bg-sky-500 text-white' : 'bg-white/10 text-gray-300'}`}
              >
                {ar}
              </button>
            ))}
          </div>
        )}

        {showVideoAspectRatio && (
            <div className="mb-4">
                <span className="text-sm text-gray-300 mr-3">Aspect Ratio:</span>
                {(['16:9', '9:16'] as const).map(ar => (
                    <button type="button" key={ar} onClick={() => setVideoAspectRatio(ar)} className={`px-3 py-1 mr-2 text-xs rounded-full ${videoAspectRatio === ar ? 'bg-sky-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                        {ar}
                    </button>
                ))}
            </div>
        )}

        <button type="submit" disabled={isSubmitDisabled} className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            {isLoading ? 'Creating...' : `Start ${activeTab === 'video' ? 'Video' : 'Creation'}`}
        </button>
      </form>
    );
  };
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-slide-up-fade-in p-4">
      {renderTabs()}
      
      <div className="w-full flex flex-col items-center">
        {isLoading ? (
          <LoadingSpinner message={loadingMessage} />
        ) : error ? (
            <div className="text-center p-4 glass-pane max-w-md border-red-500/50">
                <AlertIcon className="mx-auto h-8 w-8 text-red-400 mb-2"/>
                <p className="text-red-300">{error}</p>
            </div>
        ) : result ? (
            <div className="mt-6 text-center">
                {result.startsWith('data:image') ? <img src={result} alt="Generated result" className="rounded-lg max-w-full max-h-96" /> : null}
                {result.startsWith('blob:') ? <video src={result} controls autoPlay loop className="rounded-lg max-w-full max-h-96" /> : null}
            </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default CreateStudioView;