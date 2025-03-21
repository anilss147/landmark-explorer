import { HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Explore } from "./icons/Explore";

const Header = () => {
  return (
    <header className="bg-white shadow-md py-3 px-4 flex justify-between items-center">
      <div className="flex items-center">
        <Explore className="text-blue-500 mr-2 h-6 w-6" />
        <h1 className="font-semibold text-xl">Landmark Explorer</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <HelpCircle className="h-5 w-5 text-gray-600" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
