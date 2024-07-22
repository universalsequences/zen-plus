import type { API } from "@/lib/nodes/context";
import { dedupe } from "./dedupe";
import { keydown } from "./keys";
import { currenttime, converttime } from "./time";
import { select, route, filterselect } from "./select";
import { dict, dict_get, dictpack } from "./json";
import { toggle } from "./toggle";
import { print } from "./print";
import { zequencer_index } from "./zequencer/index";
import {
  identity,
  filter_neq,
  filter_arg_eq,
  filter_eq,
  filter_mod_eq,
  filter_lt,
  filter_lte,
  filter_gte,
} from "./control";
import { function_editor } from "./function";
import { knob, slider } from "./slider";
import { preset } from "./preset";
import { interval, metro, schedule } from "./metro";
import { strings } from "./strings";
import { divider, umenu, buttonoptions } from "./umenu";
import { order } from "./order";
import { math } from "./math";
import { lists } from "./list";
import { button, matrix } from "./matrix";
import { attrui } from "./attrui";
import { buffer } from "./buffer";
import { ast, wasmviewer } from "./wasmviewer";
import { waveform } from "./waveform";
import { comment } from "./comment";
import { send, patchmessage, subscribe } from "./messages";
import { zfetch } from "./fetch";

export const api: API = {
  waveform,
  wasmviewer,
  ast,
  patchmessage,
  route,
  buffer,
  subscribe,
  send,
  schedule,
  button,
  get: dict_get,
  select,
  function: function_editor,
  matrix,
  comment,
  ...lists,
  ...math,
  ...order,
  interval,
  metro,
  "filter.=": filter_eq,
  "filter.!=": filter_neq,
  "filter.<": filter_lt,
  "filter.<=": filter_lte,
  "filter.>=": filter_gte,
  "filter.%=": filter_mod_eq,
  "filter.i=": filter_arg_eq,
  buttonoptions,
  attrui,
  umenu,
  filterselect,
  divider,
  dedupe,
  slider,
  knob,
  preset,
  dictpack,
  currenttime,
  converttime,
  print,
  dict,
  identity,
  ...zequencer_index,
  fetch: zfetch,
  toggle,
  "key.down": keydown,
  ...strings,
};
