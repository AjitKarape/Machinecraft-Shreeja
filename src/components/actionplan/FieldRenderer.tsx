import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Image as ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";

interface FieldRendererProps {
  field: {
    id: string;
    field_type: 'text' | 'image' | 'checkbox';
    label: string;
    text_value: string | null;
    image_url: string | null;
    checkbox_value: boolean | null;
  };
  onUpdate: (fieldId: string, updates: any) => void;
}

export function FieldRenderer({ field, onUpdate }: FieldRendererProps) {
  const [uploading, setUploading] = useState(false);
  const [localTextValue, setLocalTextValue] = useState(field.text_value || '');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Update local state when field prop changes
  useState(() => {
    setLocalTextValue(field.text_value || '');
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-images')
        .getPublicUrl(filePath);

      onUpdate(field.id, { image_url: publicUrl });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!field.image_url) return;

    try {
      const path = field.image_url.split('/').pop();
      if (path) {
        await supabase.storage.from('task-images').remove([path]);
      }
      onUpdate(field.id, { image_url: null });
      toast.success("Image removed");
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error("Failed to remove image");
    }
  };

  const handleImageDownload = async () => {
    if (!field.image_url) return;
    
    try {
      const response = await fetch(field.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${field.label.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded");
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error("Failed to download image");
    }
  };

  if (field.field_type === 'text') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Textarea
          value={localTextValue}
          onChange={(e) => setLocalTextValue(e.target.value)}
          onBlur={() => onUpdate(field.id, { text_value: localTextValue })}
          placeholder="Enter text..."
          className="min-h-[80px] w-full"
        />
      </div>
    );
  }

  if (field.field_type === 'image') {
    return (
      <>
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-4">
            {field.image_url ? (
              <div className="space-y-2">
                <img
                  src={field.image_url}
                  alt={field.label}
                  className="max-h-48 rounded-md mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setImageDialogOpen(true)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImageDownload}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleImageRemove}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  {uploading ? (
                    <ImageIcon className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                  <span className="text-sm">
                    {uploading ? 'Uploading...' : 'Click to upload image'}
                  </span>
                </div>
              </label>
            )}
          </div>
        </div>

        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-4xl">
            <img
              src={field.image_url || ''}
              alt={field.label}
              className="w-full h-auto rounded-md"
            />
            <Button
              onClick={handleImageDownload}
              className="w-full mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (field.field_type === 'checkbox') {
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={field.id}
          checked={field.checkbox_value || false}
          onCheckedChange={(checked) => onUpdate(field.id, { checkbox_value: checked })}
        />
        <Label htmlFor={field.id} className="cursor-pointer">
          {field.label}
        </Label>
      </div>
    );
  }

  return null;
}
