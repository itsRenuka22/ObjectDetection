import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

export async function fetchModels() {
  const res = await api.get('/models');
  return res.data;
}

export async function detectImage(file, modelName) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/detect/image?model_name=${encodeURIComponent(modelName)}`, formData);
  return res.data;
}

export async function detectVideo(file, modelName) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/detect/video?model_name=${encodeURIComponent(modelName)}`, formData, {
    timeout: 300000, // 5 min — video processing takes time
  });
  return res.data;
}

export async function compareModels(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/detect/compare', formData);
  return res.data;
}
