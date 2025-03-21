import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorDisplayProps = {
  error: string;
  onRetry: () => void;
};

const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <div className="flex items-center text-red-500 mb-4">
          <AlertCircle className="h-6 w-6 mr-2" />
          <h3 className="font-semibold text-lg">Error Loading Data</h3>
        </div>
        <p className="text-gray-700 mb-4">
          {error || "We encountered a problem while trying to load landmark data. Please try again later."}
        </p>
        <Button onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
