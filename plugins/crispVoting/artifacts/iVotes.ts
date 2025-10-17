import { parseAbi } from "viem";

export const iVotesAbi = parseAbi([
  "function getVotes(address owner) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function delegate(address delegatee) external",
  "function delegates(address account) public view returns (address)",
  "function mint(address to, uint256 amount) external",
]);
