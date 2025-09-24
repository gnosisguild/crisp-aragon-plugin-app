import { PUB_CRISP_VOTING_PLUGIN_ADDRESS } from "@/constants";
import { IconType } from "@aragon/ods";

type PluginItem = {
  /** The URL fragment after /plugins */
  id: string;
  /** The name of the folder within `/plugins` */
  folderName: string;
  /** Title on menu */
  title: string;
  icon?: IconType;
  pluginAddress: string;
};

export const plugins: PluginItem[] = [
  {
    id: "crisp-token-voting",
    folderName: "crispVoting",
    title: "CRISP Voting",
    icon: IconType.BLOCKCHAIN_BLOCKCHAIN,
    pluginAddress: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
  },
];
