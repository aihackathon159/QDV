
import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-green-100 p-4 text-center">
      <h1 className="text-5xl md:text-7xl font-bold text-blue-800 mb-4">
        Speech Buddy VN
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
        Chào mừng bạn đến với người bạn đồng hành luyện nói! Một không gian an toàn và vui vẻ để trẻ em Việt Nam thực hành và cải thiện kỹ năng nói của mình.
      </p>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
      >
        Bắt đầu
      </button>
    </div>
  );
};

export default IntroScreen;
