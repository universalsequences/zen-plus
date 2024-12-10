import React, { useCallback, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db/firebase"; // Ensure you have a firebase config file where 'db' is your Firestore instance
import { CommitIcon, HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { getTime } from "@/components/ProjectOption";
import { File } from "@/lib/files/types";
import { PatchDocComponent } from "../org/PatchDocComponent";

const FileComponent: React.FC<{
  isMini: boolean;
  isRevision: boolean;
  className: string;
  openFile: (x: File | null) => void;
  fileExpanded: File | null;
  setFileExpanded: (x: File | null) => void;
  file: File;
  setFileToOpen: (x: any | null) => void;
  setRevisions: (x: File[]) => void;
  showAttributes?: boolean;
}> = ({
  file,
  showAttributes,
  setRevisions,
  fileExpanded,
  setFileExpanded,
  openFile,
  className,
  isRevision,
}) => {
  const [favorited, setFavorited] = useState(file.favorited);
  const toggleHeart = useCallback(
    async (e: any) => {
      e.stopPropagation();
      const documentRef = doc(db, "patches", file.id);

      try {
        await updateDoc(documentRef, {
          favorited: !favorited,
        });
        setFavorited(!favorited);
      } catch (error) {}
    },
    [file, favorited, setFavorited],
  );

  return (
    <div
      onClick={() => {
        if (isRevision) {
          openFile(file);
        } else {
          setRevisions([]);
          setFileExpanded(file);
        }
      }}
      className={
        (file === fileExpanded ? "bg-zinc-700 rounded-lg " : "") +
        "flex flex-col m-3 text-sm border-zinc-800 border hover:border-zinc-200 transition-all p-4 cursor-pointer relative"
      }
    >
      <div
        className={`${className}  mb-5 hover:bg-zinc-700 transition-colors bg-zinc-800 rounded-lg relative overflow-hidden`}
      >
        {file.screenshot && <img src={file.screenshot} className="w-full h-full object-cover" />}
        {file.commits && (
          <div
            onClick={(e: any) => {
              e.stopPropagation();
              setRevisions([]);
              setFileExpanded(file);
            }}
            style={
              file.screenshot
                ? { backgroundColor: "#ffffffa3", backdropFilter: "blur(9px)", color: "#3d3d3d" }
                : {}
            }
            className="hover:scale-105 transition-all absolute bottom-5 right-5 text-zinc-400 text-xs flex w-12 rounded-full px-1"
          >
            <CommitIcon className="my-auto ml-1 w-5 mr-2" color="gray" /> {file.commits.length}
          </div>
        )}
      </div>
      <div>{file.name}</div>
      {
        <div className="flex">
          <div className="text-zinc-500">{getTime(file.createdAt.toDate())}</div>
          {file.isPublic && <div className="text-teal-500 ml-2">public</div>}
          {file.tags?.map((tag) => (
            <div style={{ fontSize: 8 }} className="text-zinc-200 ml-2">
              {tag}
            </div>
          ))}
          {(favorited || isRevision) && (
            <div onClick={toggleHeart} className="ml-auto cursor-pointer">
              {favorited ? (
                <HeartFilledIcon color="red" className="w-5 h-5" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </div>
          )}
        </div>
      }
    </div>
  );
};

export default FileComponent;
