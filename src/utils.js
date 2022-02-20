export function replaceMember(struct, type, name) {
  const index = struct.members.findIndex(member => member.name === name);
  const before = struct.members.slice(0, index);
  const after = struct.members.slice(index + 1, struct.members.length);

  struct.members = before;
  struct.addMember(type, name);

  after.forEach(member => struct.addMember(member.type, member.name));
}