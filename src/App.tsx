import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Index from "./pages/Index";
import DetectionPage from "./pages/DetectionPage";
import GestureLibrary from "./pages/GestureLibrary";
import TrainPage from "./pages/TrainPage";
import AlphabetMode from "./pages/AlphabetMode";
import NumbersMode from "./pages/NumbersMode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/detect" element={<DetectionPage />} />
          <Route path="/gestures" element={<GestureLibrary />} />
          <Route path="/train" element={<TrainPage />} />
          <Route path="/alphabet" element={<AlphabetMode />} />
          <Route path="/numbers" element={<NumbersMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
