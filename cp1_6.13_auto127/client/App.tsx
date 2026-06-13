import { useState, useEffect, useCallback } from 'react';
import Gallery from './Gallery';
import Slideshow from './Slideshow';
import Uploader from './Uploader';
import { getPhotos, getTags } from './photoService';
import type { Photo, Tag } from './types';

const PAGE_SIZE = 20;

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIs