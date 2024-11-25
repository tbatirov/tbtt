import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Key, Save } from 'lucide-react';
import { configService } from '../../services/mapping/config';

const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required')
});

type APIKeyFormData = z.infer<typeof apiKeySchema>;

export const APIKeyConfig = () => {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<APIKeyFormData>({
    resolver: zodResolver(apiKeySchema)
  });

  useEffect(() => {
    const config = configService.getConfig();
    if (config.apiKey) {
      setValue('apiKey', config.apiKey);
    }
  }, [setValue]);

  const onSubmit = (data: APIKeyFormData) => {
    configService.setApiKey(data.apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-medium">API Configuration</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            Anthropic API Key
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="apiKey"
              type="text"
              {...register('apiKey')}
              className={`block w-full pr-10 sm:text-sm rounded-md ${
                errors.apiKey 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              placeholder="sk-ant-api03-..."
            />
            {errors.apiKey && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {errors.apiKey && (
            <p className="mt-2 text-sm text-red-600">{errors.apiKey.message}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Required for AI-powered transaction mapping. Get your API key from{' '}
            <a 
              href="https://console.anthropic.com/account/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Anthropic Console
            </a>
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save API Key'}
          </button>
        </div>

        {saved && (
          <div className="mt-2 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  API key saved successfully
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};