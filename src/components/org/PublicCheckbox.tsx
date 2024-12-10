import { useState, ChangeEvent } from "react";

interface PublicCheckboxProps {
  initialValue?: boolean;
  onStateChange?: (isPublic: boolean) => void;
}

export const PublicCheckbox: React.FC<PublicCheckboxProps> = ({
  initialValue = false,
  onStateChange,
}) => {
  const [isPublic, setIsPublic] = useState<boolean>(initialValue);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked;
    setIsPublic(newValue);
    onStateChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-2 ">
      <input
        type="checkbox"
        id="public-option"
        checked={isPublic}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="public-option" className="text-xs ">
        public
      </label>
    </div>
  );
};
