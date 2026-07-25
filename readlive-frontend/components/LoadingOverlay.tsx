import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  title?: string;
  steps?: string[];
}

const LoadingOverlay = ({
  title = "Bringing your book to life...",
  steps = [
    "Uploading your PDF",
    "Generating your cover",
    "Setting up your voice assistant",
  ],
}: LoadingOverlayProps) => {
  return (
    <div className="loading-wrapper">
      <div className="loading-shadow-wrapper">
        <div className="loading-shadow">
          <Loader2 className="loading-animation" size={40} />
          <p className="loading-title">{title}</p>
          <ul className="loading-progress">
            {steps.map((step) => (
              <li key={step} className="loading-progress-item">
                <span className="loading-progress-status" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
