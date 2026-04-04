import yaml from "/npm/js-yaml@4.1.1/dist/js-yaml.min.mjs";

export const getData = async (handle, name = "_config.yaml") => {
  name = name.replace(/^\.\//, "");
  const configHandle = await handle.get(name);
  const configText = await configHandle.text();
  return yaml.load(configText);
};

export const saveData = async (handle, name = "_config.yaml", data) => {
  const configHandle = await handle.get(name);
  const configText = yaml.dump(data);
  await configHandle.write(configText);
};
