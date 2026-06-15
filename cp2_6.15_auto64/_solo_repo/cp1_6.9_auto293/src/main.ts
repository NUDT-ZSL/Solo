import './styles.css';
import { App } from './App';

const canvas = document.getElementById('starCanvas') as HTMLCanvasElement;
const toolbar = document.getElementById('toolbar') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;

if (!canvas) {
  throw new Error('Canvas element #starCanvas not found');
}

if (!toolbar) {
  throw new Error('Toolbar element #toolbar not found');
}

if (!fileInput) {
  throw new Error('File input element #fileInput not found');
}

const app = new App(canvas, toolbar, fileInput);
app.start();
