import React from 'react';
import { X, BitcoinIcon, Bitcoin } from 'lucide-react';

const CreateLobbyModal = ({ 
  isOpen, 
  onClose, 
  betAmount, 
  onBetAmountChange, 
  onCreateLobby, 
  loading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Create New Game</h2>
        </div>

        {/* Modal content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="betAmount" className="block text-sm font-medium text-gray-700">
              Bet Amount (ETH)
            </label>
            <div className="relative">
              <BitcoinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="betAmount"
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={betAmount}
                onChange={onBetAmountChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Enter bet amount"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCreateLobby}
              disabled={loading || !betAmount}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 
                       text-white font-bold py-2 px-4 rounded-lg transition-colors 
                       duration-200 ease-in-out flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Game'
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 
                       font-bold py-2 px-4 rounded-lg transition-colors duration-200 ease-in-out"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLobbyModal;