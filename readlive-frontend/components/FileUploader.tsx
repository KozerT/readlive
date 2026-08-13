"use client";

import { X, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import {
  useController,
  useFormContext,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import {
  FormControl,
  FormFieldContext,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface FileUploaderProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  acceptTypes: string;
  icon: LucideIcon;
  placeholder: string;
  hint: string;
  className?: string;
  iconClassName?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileUploader = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  acceptTypes,
  icon: Icon,
  placeholder,
  hint,
  className,
  iconClassName,
}: FileUploaderProps<TFieldValues>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { field } = useController({ control, name });
  const { trigger } = useFormContext<TFieldValues>();
  const file = field.value as File | undefined;

  const removeFile = () => {
    field.onChange(undefined);
    trigger(name);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormLabel className="form-label">{label}</FormLabel>
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "upload-dropzone",
            file && "upload-dropzone-uploaded",
            className
          )}
        >
          <FormControl>
            <input
              ref={(element) => {
                field.ref(element);
                inputRef.current = element;
              }}
              type="file"
              accept={acceptTypes}
              className="sr-only" /* Changed from 'hidden' to 'sr-only' */
              onBlur={field.onBlur}
              onChange={(event) => {
                field.onChange(event.target.files?.[0]);
                trigger(name);
              }}
            />
          </FormControl>
          {file ? (
            <>
              <Icon className={cn("upload-dropzone-icon", iconClassName)} />
              <p className="upload-dropzone-text max-w-[80%] truncate">
                {file.name}
              </p>
              <p className="upload-dropzone-hint">
                {formatFileSize(file.size)}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile();
                }}
                className="upload-dropzone-remove mt-3"
                aria-label={`Remove ${label}`}
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <>
              <Icon className={cn("upload-dropzone-icon", iconClassName)} />
              <p className="upload-dropzone-text">{placeholder}</p>
              <p className="upload-dropzone-hint">{hint}</p>
            </>
          )}
        </div>

        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  );
};

export default FileUploader;
