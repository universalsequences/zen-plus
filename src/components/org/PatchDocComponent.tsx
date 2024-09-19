import { ObjectNode } from "@/lib/nodes/types";
import { PatchDoc } from "@/lib/org/types";
import { deleteTagFromDoc, tagDoc } from "@/lib/org/tags";
import { Cross2Icon, DiscIcon, PlusCircledIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { useCallback, useState } from "react";

interface Props {
  node?: ObjectNode;
  doc?: PatchDoc;
  docId?: string;
}
export const PatchDocComponent = (props: Props) => {
  const [text, setText] = useState("");
  const [addingNewTag, setAddingNewTag] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<string | null>(null);
  const docId = props.docId || props.node?.subpatch?.docId;
  const doc = props.doc || props.node?.subpatch?.doc;
  const [tags, setTags] = useState(doc?.tags || []);

  const deleteTag = useCallback(() => {
    if (docId && tagToEdit) {
      if (doc) {
        doc.tags = [...(doc.tags || [])].filter((x) => x !== tagToEdit);
      }
      deleteTagFromDoc(docId, tagToEdit);
    }
    setTagToEdit(null);
  }, [docId, doc, tagToEdit]);

  const saveTag = useCallback(() => {
    setAddingNewTag(false);
    const tag = text;
    if (doc) {
      doc.tags = [...(doc.tags || []), tag];
      if (tag && docId) {
        tagDoc(docId, tag);
        setTags(doc.tags);
      }
    }
    setText("");
  }, [text, docId, doc]);
  if (!docId || !doc) {
    return <></>;
  }

  return (
    <div className="p-2 w-full flex flex-wrap">
      {tagToEdit ? (
        <div className="flex flex-col">
          <div className="flex">
            <span className="text-zinc-300">tag:</span> <span className="ml-2">{tagToEdit}</span>{" "}
            <TrashIcon className="ml-auto cursor-pointer" onClick={deleteTag} />
            <Cross2Icon className="ml-2 cursor-pointer" onClick={() => setTagToEdit(null)} />
          </div>
        </div>
      ) : addingNewTag ? (
        <div className="flex">
          <input
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
            className="flex-1 px-1 outline-none"
            value={text}
            type="input"
          />
          <DiscIcon onClick={saveTag} className="ml-4 w-4 h-4 cursor-pointer" />
        </div>
      ) : (
        <div className="flex">
          <span className="text-zinc-500 mr-2">tags</span>
          <div className="flex">
            {doc.tags?.map((x) => (
              <span onClick={() => setTagToEdit(x)} className="mx-1 underline cursor-pointer">
                {x}
              </span>
            ))}
          </div>
          <PlusCircledIcon
            onClick={() => setAddingNewTag(true)}
            className="cursor-pointer ml-auto w-4 h-4 "
          />
        </div>
      )}
    </div>
  );
};
