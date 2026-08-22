import cosmoLoader from '@/assets/cosmo-loader.gif';

export const CosmoLoadingState = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        <img 
          src={cosmoLoader} 
          alt="Loading Cosmo" 
          className="w-32 h-32 object-contain"
        />
        <p className="text-zinc-500 text-sm font-medium animate-pulse">
          Loading Cosmo...
        </p>
      </div>
    </div>
  );
};
