import aiImg from './assets/categories/ai.svg';
import cyberImg from './assets/categories/cyber.svg';
import dataImg from './assets/categories/data.svg';
import defaultImg from './assets/categories/default.svg';
import entrepreneurshipImg from './assets/categories/entrepreneurship.svg';
import hrImg from './assets/categories/hr.svg';
import pythonImg from './assets/categories/python.svg';
import skillImg from './assets/categories/skill.svg';
import teachingImg from './assets/categories/teaching.svg';
import tourismImg from './assets/categories/tourism.svg';
import webImg from './assets/categories/web.svg';
import { BarChart3, Bot, GraduationCap, Handshake, Laptop, Plane, Rocket, Shield, Star, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const categoryLabels: Record<string, string> = {
  web: 'Web Development',
  python: 'Python',
  data: 'Data Science',
  ai: 'AI/ML',
  cyber: 'Cybersecurity',
  skill: 'Skill Development',
  teaching: 'Teacher Training',
  hr: 'Human Resource',
  entrepreneurship: 'Entrepreneurship',
  tourism: 'Tourism & Hospitality',
};

export const categoryIcons: Record<string, LucideIcon> = {
  web: Laptop,
  python: Terminal,
  data: BarChart3,
  ai: Bot,
  cyber: Shield,
  skill: Star,
  teaching: GraduationCap,
  hr: Handshake,
  entrepreneurship: Rocket,
  tourism: Plane,
};

export const knownOrder = ['web', 'python', 'data', 'ai', 'cyber', 'skill', 'teaching', 'hr', 'entrepreneurship', 'tourism'];

export const titleCase = (value: string) => value
  ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  : 'Other';

export const categoryImages: Record<string, string> = {
  web: webImg,
  python: pythonImg,
  data: dataImg,
  ai: aiImg,
  cyber: cyberImg,
  skill: skillImg,
  teaching: teachingImg,
  hr: hrImg,
  entrepreneurship: entrepreneurshipImg,
  tourism: tourismImg,
  default: defaultImg,
};

export const categoryImage = (category: string) => categoryImages[category] || categoryImages.default;
