import classNames from "classnames";

interface ButtonProps {
    onClick?: () => void;
    className: string;
    testId?: string;
    type?: "submit" | "button" | "reset";
    disabled?: boolean;
    "aria-label"?: string;
    children: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    testId,
    className,
    type = "submit",
    disabled = false,
    "aria-label": ariaLabel,
}) => {
    return (
        <button
            type={type}
            data-testid={testId}
            onClick={onClick}
            aria-label={ariaLabel}
            disabled={disabled}
            className={classNames(
                "bg-rose-400 p-2 rounded-lg hover:bg-rose-600 text-white",
                className,
                { "cursor-not-allowed": disabled }
            )}
        >
            {children}
        </button>
    );
};