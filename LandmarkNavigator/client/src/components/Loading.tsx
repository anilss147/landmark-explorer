const Loading = () => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700 font-medium">Loading landmarks...</p>
      </div>
    </div>
  );
};

export default Loading;
