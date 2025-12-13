"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import {useAutoResizeTextarea} from "../hooks/textareahook";
import { cn } from "../utils/cn";
import { Textarea } from "./ui/Textarea";

type ChatInputProps = {
  value?: string;
  onChange?: (v: string) => void;
  onSubmit?: () => void;
};

export default function AI_Input({ value: controlledValue, onChange, onSubmit }: ChatInputProps) {
    const [internalValue, setInternalValue] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 52,
        maxHeight: 200,
    });

    const [isFocused, setIsFocused] = useState(false);

    const isControlled = typeof controlledValue !== "undefined";

    const value = isControlled ? controlledValue! : internalValue;

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit();
        } else {
            setInternalValue("");
            adjustHeight(true);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleContainerClick = () => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    return (
        <div className="w-full py-4">
            <div className="relative w-full">
                <div
                    role="textbox"
                    tabIndex={0}
                    aria-label="Search input container"
                    className={cn(
                        "relative flex flex-col rounded-xl transition-all duration-200 w-full text-left cursor-text",
                        isFocused && "ring-1 ring-black/20 dark:ring-white/20"
                    )}
                    onClick={handleContainerClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            handleContainerClick();
                        }
                    }}
                >
                    <div className="overflow-y-auto max-h-[200px]">
                        <Textarea
                            id="ai-input-04"
                            value={value}
                            placeholder="Ask a question about your PDF..."
                            className="w-full rounded-xl rounded-b-none px-4 py-3 bg-black/5 border-none text-black/70  resize-none focus-visible:ring-0 leading-[1.2]"
                            ref={textareaRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            onChange={(e) => {
                                if (isControlled) {
                                    onChange?.(e.target.value);
                                } else {
                                    setInternalValue(e.target.value);
                                }
                                adjustHeight();
                            }}
                        />
                    </div>

                    <div className="h-12 bg-black/5  rounded-b-xl">
                       
                        <div className="absolute right-3 bottom-3">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className={cn(
                                    "rounded-lg p-2 transition-colors",
                                    value
                                        ? "bg-sky-500/15 text-sky-500"
                                        : "bg-black/5  text-black/40  hover:text-black  cursor-pointer"
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
