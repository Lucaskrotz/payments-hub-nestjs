// Cliente de teste: fica ouvindo o evento payment.confirmed.
// Uso: npm run ws:listen (com a API rodando). Para outra URL: API_URL=http://localhost:3100 npm run ws:listen
import { io } from 'socket.io-client';

const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
const socket = io(`${baseUrl}/payments`);

socket.on('connect', () => console.log(`conectado (${socket.id}) em ${baseUrl}/payments`));
socket.on('payment.confirmed', (payment) => console.log('payment.confirmed', JSON.stringify(payment)));
socket.on('disconnect', (reason) => console.log('desconectado:', reason));
socket.on('connect_error', (error) => console.error('erro de conexão:', error.message));
