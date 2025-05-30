import { StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";

interface Props {
  schema: StepDataSchema;
  parameter: string;
  setParameter: React.Dispatch<React.SetStateAction<string>>;
  color: string;
}

export const CirklonParameters = (props: Props) => {
  const { parameter, schema, setParameter } = props;
  return (
    <div className="flex gap-2">
      {schema.map((field) => (
        <div
          style={{ color: parameter === field.name ? props.color : "" }}
          key={field.name}
          onClick={() => setParameter(field.name)}
          className={`px-2 px-1 rounded-full cursor-pointer ${parameter === field.name ? "bg-zinc-800" : "bg-black text-white"}`}
        >
          {field.name}
        </div>
      ))}
    </div>
  );
};
