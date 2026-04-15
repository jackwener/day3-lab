import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/gold',
  timeout: 10000,
});

// 响应拦截器：统一提取data
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('API Error:', err);
    return Promise.reject(err);
  }
);

export interface MarketPriceResponse {
  price: number;
  currency: string;
  updated_at: string;
}

export interface PriceHistoryResponse {
  data: Array<{
    timestamp: string;
    price: number;
  }>;
  range: string;
}

export interface OCRResponse {
  weight: number | null;
  confidence: number;
}

export const marketApi = {
  getCurrentPrice: (): Promise<MarketPriceResponse> => api.get('/market/price'),
  getPriceHistory: (range: 'realtime' | '1month' | '3month'): Promise<PriceHistoryResponse> => 
    api.get('/market/history', { params: { range } }),
};

export const ocrApi = {
  recognizeWeight: (imageFile: File): Promise<OCRResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/ocr/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5000,
    });
  },
};

export default api;
