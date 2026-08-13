"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, ImagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import FileUploader from "@/components/FileUploader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Form } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  voiceCategories,
  voiceOptions,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type VoiceKey = keyof typeof voiceOptions;
const voiceKeys = Object.keys(voiceOptions) as [VoiceKey, ...VoiceKey[]];

const uploadFormSchema = z.object({
  pdfFile: z
    .instanceof(File, { message: "Please select a PDF file to upload." })
    .refine(
      (file) => ACCEPTED_PDF_TYPES.includes(file.type),
      "Only PDF files are supported."
    )
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      "PDF must be 50 MB or smaller."
    ),
  coverImage: z
    .instanceof(File)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Cover must be a JPG, PNG or WEBP image."
    )
    .refine(
      (file) => file.size <= MAX_IMAGE_SIZE,
      "Cover image must be 10 MB or smaller."
    )
    .optional(),
  title: z.string().trim().min(1, "Title is required."),
  author: z.string().trim().min(1, "Author name is required."),
  voice: z.enum(voiceKeys, { message: "Please choose a voice." }),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

const UploadForm = () => {
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: DEFAULT_VOICE as VoiceKey,
    },
  });

  const selectedVoice = form.watch("voice");

  const onSubmit = async (values: UploadFormValues) => {
    const formData = new FormData();
    formData.append("pdfFile", values.pdfFile);
    if (values.coverImage) formData.append("coverImage", values.coverImage);
    formData.append("title", values.title);
    formData.append("author", values.author);
    formData.append("voice", values.voice);

    // TODO: POST to the book upload endpoint once available
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

  return (
    <div className="new-book-wrapper">
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <FileUploader
            control={form.control}
            name="pdfFile"
            label="PDF File"
            acceptTypes="application/pdf"
            icon={FileText}
            placeholder="Click to Upload"
            hint="PDF file (max 50 MB)"
          />

          <FileUploader
            control={form.control}
            name="coverImage"
            label="Cover Image"
            acceptTypes="image/jpeg,image/jpg,image/png,image/webp"
            icon={ImagePlus}
            placeholder="Click to upload cover image"
            hint="Leave empty to autogenerate"
            className="h-[120px]"
            iconClassName="mb-1.5 size-8"
          />

          <div>
            <label htmlFor="title" className="form-label">
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="ex: Rich Dad Poor Dad"
              className="form-input"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="author" className="form-label">
              Author Name
            </label>
            <input
              id="author"
              type="text"
              placeholder="ex: Robert Kiyosaki"
              className="form-input"
              {...form.register("author")}
            />
            {form.formState.errors.author && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.author.message}
              </p>
            )}
          </div>

          <div>
            <span className="form-label">Choose assistance voice</span>
            <RadioGroup
              value={selectedVoice}
              onValueChange={(value) =>
                form.setValue("voice", value as VoiceKey, {
                  shouldValidate: true,
                })
              }
              className="contents"
            >
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Male voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.male.map((key) => {
                    const voice = voiceOptions[key as VoiceKey];
                    return (
                      <label
                        key={key}
                        htmlFor={`voice-${key}`}
                        className={cn(
                          "voice-selector-option",
                          selectedVoice === key &&
                            "voice-selector-option-selected"
                        )}
                      >
                        <RadioGroupItem value={key} id={`voice-${key}`} />
                        <span className="flex flex-col text-left">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {voice.name}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {voice.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Female voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.female.map((key) => {
                    const voice = voiceOptions[key as VoiceKey];
                    return (
                      <label
                        key={key}
                        htmlFor={`voice-${key}`}
                        className={cn(
                          "voice-selector-option",
                          selectedVoice === key &&
                            "voice-selector-option-selected"
                        )}
                      >
                        <RadioGroupItem value={key} id={`voice-${key}`} />
                        <span className="flex flex-col text-left">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {voice.name}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {voice.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </RadioGroup>
            {form.formState.errors.voice && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.voice.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="form-btn"
          >
            Bring Text to Life
          </button>
        </form>
      </Form>

      {form.formState.isSubmitting && <LoadingOverlay />}
    </div>
  );
};

export default UploadForm;
