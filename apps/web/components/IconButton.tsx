import { ReactNode } from "react";

export function IconButton({
    icon, 
    onClick, 
    activated,
    disabled = false
}: {
    icon: ReactNode;
    onClick: () => void;
    activated: boolean;
    disabled?: boolean;
}) {
    const handleClick = () => {
        if (!disabled) {
            onClick();
        }
    };

    return (
        <div 
            className={`m-2 rounded-full border p-2 bg-black transition-colors ${
                disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "cursor-pointer hover:bg-gray"
            } ${activated ? "text-red-400" : "text-white"}`} 
            onClick={handleClick}
        >
            {icon}
        </div>
    );
}

