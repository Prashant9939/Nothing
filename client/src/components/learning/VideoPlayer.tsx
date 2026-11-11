import { Video } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title: string;
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(url);

  if (!youtubeId) {
    return (
      <div className="bg-cream border border-sand rounded-[24px] p-8 text-center">
        <Video className="w-12 h-12 text-charcoal mx-auto mb-3" />
        <p className="break-words text-charcoal text-sm font-medium">{title}</p>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm font-semibold text-ink hover:text-burnt underline"
        >
          Watch Video
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-sand">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
