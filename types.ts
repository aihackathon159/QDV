import type React from 'react';

// FIX: Add type definitions for model-viewer to work with React/JSX.
// This declaration ensures the 'model-viewer' custom element is recognized by TypeScript.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src: string;
        alt: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'disable-zoom'?: boolean;
        'camera-orbit'?: string;
        'field-of-view'?: string;
        ar?: boolean;
        'shadow-intensity'?: string;
        'animation-name'?: string;
        autoplay?: boolean;
      }, HTMLElement>;
    }
  }
}

export enum Screen {
  Intro,
  Management,
  SpeechRoom,
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export interface SessionReport {
  id: string;
  date: string;
  duration: number; // in minutes
  conversation: Message[];
  psychologicalNotes: string[];
  accuracy: number;
  engagement: string;
  topic: string;
  summary: string;
}

export interface SessionData {
    topic: string;
    vocabulary: string[];
}