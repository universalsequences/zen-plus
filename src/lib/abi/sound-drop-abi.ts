export const {abi} = {
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_metadataRenderer",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MINTER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "dsp",
          "type": "string"
        },
        {
          "internalType": "uint104",
          "name": "price",
          "type": "uint104"
        },
        {
          "internalType": "uint64",
          "name": "editionSize",
          "type": "uint64"
        }
      ],
      "name": "newDrop",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  "bytecode": {
    "object": "0x60c060405260006080527ff0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc960a05234801561003957600080fd5b506040516108ac3803806108ac8339810160408190526100589161007d565b600080546001600160a01b0319166001600160a01b03929092169190911790556100ad565b60006020828403121561008f57600080fd5b81516001600160a01b03811681146100a657600080fd5b9392505050565b60805160a0516107dc6100d06000396000608501526000604b01526107dc6000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063a217fddf14610046578063d539139314610080578063eb3e312e146100a7575b600080fd5b61006d7f000000000000000000000000000000000000000000000000000000000000000081565b6040519081526020015b60405180910390f35b61006d7f000000000000000000000000000000000000000000000000000000000000000081565b6100ba6100b5366004610412565b6100d2565b6040516001600160a01b039091168152602001610077565b60008061013b604051602001610127907f7b226465736372697074696f6e223a20225061746368657320666f72205a656e8152722b222c20226e616d65223a20225a656e2b227d60681b602082015260330190565b604051602081830303815290604052610261565b60405160200161014b9190610508565b60408051601f198184030181529082905261016a918790602001610579565b60408051808303601f1901815260e0830182526001600160681b038716835262989680602084015260008383018190526601c6bf5263400060608501526080840181905260a0840181905260c0840181905280549251635f7317fb60e01b815291945073eb29a4e5b84fef428c072deba2444e93c080ce879390928492635f7317fb926102139233928b926103209285926001600160a01b03909116908c908b906004016105a7565b6020604051808303816000875af1158015610232573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061025691906106ce565b979650505050505050565b6060815160000361028057505060408051602081019091526000815290565b600060405180606001604052806040815260200161076760409139905060006003845160026102af9190610714565b6102b9919061072d565b6102c490600461074f565b905060006102d3826020610714565b67ffffffffffffffff8111156102eb576102eb6103c8565b6040519080825280601f01601f191660200182016040528015610315576020820181803683370190505b509050818152600183018586518101602084015b818310156103835760039283018051603f601282901c811687015160f890811b8552600c83901c8216880151811b6001860152600683901c8216880151811b60028601529116860151901b93820193909352600401610329565b60038951066001811461039d57600281146103ae576103ba565b613d3d60f01b6001198301526103ba565b603d60f81b6000198301525b509398975050505050505050565b634e487b7160e01b600052604160045260246000fd5b80356001600160681b03811681146103f557600080fd5b919050565b803567ffffffffffffffff811681146103f557600080fd5b60008060006060848603121561042757600080fd5b833567ffffffffffffffff8082111561043f57600080fd5b818601915086601f83011261045357600080fd5b813581811115610465576104656103c8565b604051601f8201601f19908116603f0116810190838211818310171561048d5761048d6103c8565b816040528281528960208487010111156104a657600080fd5b8260208601602083013760006020848301015280975050505050506104cd602085016103de565b91506104db604085016103fa565b90509250925092565b60005b838110156104ff5781810151838201526020016104e7565b50506000910152565b7f646174613a6170706c69636174696f6e2f6a736f6e3b6261736536342c00000081526000825161054081601d8501602087016104e4565b91909101601d0192915050565b600081518084526105658160208601602086016104e4565b601f01601f19169290920160200192915050565b60408152600061058c604083018561054d565b828103602084015261059e818561054d565b95945050505050565b6102008082526004908201819052635a656e2b60e01b61022083015261024060208301819052820152635a454e2b60e01b6102608201526001600160a01b0389166040820152600061028067ffffffffffffffff8a16606084015261ffff891660808401526001600160a01b03881660a084015286516001600160681b031660c084810191909152602088015163ffffffff1660e0850152604088015167ffffffffffffffff908116610100860152606089015181166101208601526080890151811661014086015260a0890151166101608501528701516101808401526001600160a01b0386166101a0840152806101c08401526106a88184018661054d565b9150506106c16101e08301846001600160a01b03169052565b9998505050505050505050565b6000602082840312156106e057600080fd5b81516001600160a01b03811681146106f757600080fd5b9392505050565b634e487b7160e01b600052601160045260246000fd5b80820180821115610727576107276106fe565b92915050565b60008261074a57634e487b7160e01b600052601260045260246000fd5b500490565b8082028115828204841417610727576107276106fe56fe4142434445464748494a4b4c4d4e4f505152535455565758595a6162636465666768696a6b6c6d6e6f707172737475767778797a303132333435363738392b2fa26469706673582212204a97c1ecaf4b1308190132606ebf0b3d2c4d0d445b256cf1645f3c485966d36364736f6c63430008140033",
    "sourceMap": "332:2003:52:-:0;;;442:4;396:50;;491:19;452:58;;521:93;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;570:16;:36;;-1:-1:-1;;;;;;570:36:52;-1:-1:-1;;;;;570:36:52;;;;;;;;;;332:2003;;14:290:59;84:6;137:2;125:9;116:7;112:23;108:32;105:52;;;153:1;150;143:12;105:52;179:16;;-1:-1:-1;;;;;224:31:59;;214:42;;204:70;;270:1;267;260:12;204:70;293:5;14:290;-1:-1:-1;;;14:290:59:o;:::-;332:2003:52;;;;;;;;;;;;;;;;;;",
    "linkReferences": {}
  },
  "deployedBytecode": {
    "object": "0x608060405234801561001057600080fd5b50600436106100415760003560e01c8063a217fddf14610046578063d539139314610080578063eb3e312e146100a7575b600080fd5b61006d7f000000000000000000000000000000000000000000000000000000000000000081565b6040519081526020015b60405180910390f35b61006d7f000000000000000000000000000000000000000000000000000000000000000081565b6100ba6100b5366004610412565b6100d2565b6040516001600160a01b039091168152602001610077565b60008061013b604051602001610127907f7b226465736372697074696f6e223a20225061746368657320666f72205a656e8152722b222c20226e616d65223a20225a656e2b227d60681b602082015260330190565b604051602081830303815290604052610261565b60405160200161014b9190610508565b60408051601f198184030181529082905261016a918790602001610579565b60408051808303601f1901815260e0830182526001600160681b038716835262989680602084015260008383018190526601c6bf5263400060608501526080840181905260a0840181905260c0840181905280549251635f7317fb60e01b815291945073eb29a4e5b84fef428c072deba2444e93c080ce879390928492635f7317fb926102139233928b926103209285926001600160a01b03909116908c908b906004016105a7565b6020604051808303816000875af1158015610232573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061025691906106ce565b979650505050505050565b6060815160000361028057505060408051602081019091526000815290565b600060405180606001604052806040815260200161076760409139905060006003845160026102af9190610714565b6102b9919061072d565b6102c490600461074f565b905060006102d3826020610714565b67ffffffffffffffff8111156102eb576102eb6103c8565b6040519080825280601f01601f191660200182016040528015610315576020820181803683370190505b509050818152600183018586518101602084015b818310156103835760039283018051603f601282901c811687015160f890811b8552600c83901c8216880151811b6001860152600683901c8216880151811b60028601529116860151901b93820193909352600401610329565b60038951066001811461039d57600281146103ae576103ba565b613d3d60f01b6001198301526103ba565b603d60f81b6000198301525b509398975050505050505050565b634e487b7160e01b600052604160045260246000fd5b80356001600160681b03811681146103f557600080fd5b919050565b803567ffffffffffffffff811681146103f557600080fd5b60008060006060848603121561042757600080fd5b833567ffffffffffffffff8082111561043f57600080fd5b818601915086601f83011261045357600080fd5b813581811115610465576104656103c8565b604051601f8201601f19908116603f0116810190838211818310171561048d5761048d6103c8565b816040528281528960208487010111156104a657600080fd5b8260208601602083013760006020848301015280975050505050506104cd602085016103de565b91506104db604085016103fa565b90509250925092565b60005b838110156104ff5781810151838201526020016104e7565b50506000910152565b7f646174613a6170706c69636174696f6e2f6a736f6e3b6261736536342c00000081526000825161054081601d8501602087016104e4565b91909101601d0192915050565b600081518084526105658160208601602086016104e4565b601f01601f19169290920160200192915050565b60408152600061058c604083018561054d565b828103602084015261059e818561054d565b95945050505050565b6102008082526004908201819052635a656e2b60e01b61022083015261024060208301819052820152635a454e2b60e01b6102608201526001600160a01b0389166040820152600061028067ffffffffffffffff8a16606084015261ffff891660808401526001600160a01b03881660a084015286516001600160681b031660c084810191909152602088015163ffffffff1660e0850152604088015167ffffffffffffffff908116610100860152606089015181166101208601526080890151811661014086015260a0890151166101608501528701516101808401526001600160a01b0386166101a0840152806101c08401526106a88184018661054d565b9150506106c16101e08301846001600160a01b03169052565b9998505050505050505050565b6000602082840312156106e057600080fd5b81516001600160a01b03811681146106f757600080fd5b9392505050565b634e487b7160e01b600052601160045260246000fd5b80820180821115610727576107276106fe565b92915050565b60008261074a57634e487b7160e01b600052601260045260246000fd5b500490565b8082028115828204841417610727576107276106fe56fe4142434445464748494a4b4c4d4e4f505152535455565758595a6162636465666768696a6b6c6d6e6f707172737475767778797a303132333435363738392b2fa26469706673582212204a97c1ecaf4b1308190132606ebf0b3d2c4d0d445b256cf1645f3c485966d36364736f6c63430008140033",
    "sourceMap": "332:2003:52:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;396:50;;;;;;;;160:25:59;;;148:2;133:18;396:50:52;;;;;;;;452:58;;;;;620:1712;;;;;;:::i;:::-;;:::i;:::-;;;-1:-1:-1;;;;;2047:32:59;;;2029:51;;2017:2;2002:18;620:1712:52;1883:203:59;620:1712:52;707:7;812:32;961:118;988:88;;;;;;2305:66:59;2293:79;;-1:-1:-1;;;2397:2:59;2388:12;;2381:72;2478:2;2469:12;;2091:396;988:88:52;;;;;;;;;;;;;961:13;:118::i;:::-;878:202;;;;;;;;:::i;:::-;;;;-1:-1:-1;;878:202:52;;;;;;;;;;847:261;;1095:3;;878:202;847:261;;:::i;:::-;;;;;;;-1:-1:-1;;847:261:52;;;1713:291;;;;;-1:-1:-1;;;;;1713:291:52;;;;1821:8;847:261;1713:291;;;-1:-1:-1;1713:291:52;;;;;;1890:15;1713:291;;;;;;;;;;;;;;;;;;;;;;2034:16;;1433:715;;-1:-1:-1;;;1433:715:52;;847:261;;-1:-1:-1;1354:42:52;;-1:-1:-1;;1354:42:52;;1433:54;;:715;;1536:10;;1589:11;;1635:3;;1536:10;;-1:-1:-1;;;;;2034:16:52;;;;847:261;;-1:-1:-1;;1433:715:52;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;1408:740;620:1712;-1:-1:-1;;;;;;;620:1712:52:o;318:1985:46:-;376:13;405:4;:11;420:1;405:16;401:31;;-1:-1:-1;;423:9:46;;;;;;;;;-1:-1:-1;423:9:46;;;318:1985::o;401:31::-;489:19;511:5;;;;;;;;;;;;;;;;;489:27;;565:18;611:1;592:4;:11;606:1;592:15;;;;:::i;:::-;591:21;;;;:::i;:::-;586:27;;:1;:27;:::i;:::-;565:48;-1:-1:-1;693:20:46;727:15;565:48;740:2;727:15;:::i;:::-;716:27;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;716:27:46;;693:50;;836:10;828:6;821:26;940:1;933:5;929:13;1008:4;1058;1052:11;1043:7;1039:25;1163:2;1155:6;1151:15;1245:794;1264:6;1255:7;1252:19;1245:794;;;1328:1;1315:15;;;1406:14;;1556:4;1544:2;1540:14;;;1536:25;;1522:40;;1516:47;1511:3;1507:57;;;1489:76;;1682:2;1678:14;;;1674:25;;1660:40;;1654:47;1645:57;;1609:1;1594:17;;1627:76;1821:1;1816:14;;;1812:25;;1798:40;;1792:47;1783:57;;1732:17;;;1765:76;1950:25;;1936:40;;1930:47;1921:57;;1870:17;;;1903:76;;;;2008:17;;1245:794;;;2121:1;2114:4;2108:11;2104:19;2141:1;2136:54;;;;2208:1;2203:52;;;;2097:158;;2136:54;-1:-1:-1;;;;;2152:17:46;;2145:43;2136:54;;2203:52;-1:-1:-1;;;;;2219:17:46;;2212:41;2097:158;-1:-1:-1;2290:6:46;;318:1985;-1:-1:-1;;;;;;;;318:1985:46:o;196:127:59:-;257:10;252:3;248:20;245:1;238:31;288:4;285:1;278:15;312:4;309:1;302:15;328:182;396:20;;-1:-1:-1;;;;;445:40:59;;435:51;;425:79;;500:1;497;490:12;425:79;328:182;;;:::o;515:171::-;582:20;;642:18;631:30;;621:41;;611:69;;676:1;673;666:12;691:1078;777:6;785;793;846:2;834:9;825:7;821:23;817:32;814:52;;;862:1;859;852:12;814:52;902:9;889:23;931:18;972:2;964:6;961:14;958:34;;;988:1;985;978:12;958:34;1026:6;1015:9;1011:22;1001:32;;1071:7;1064:4;1060:2;1056:13;1052:27;1042:55;;1093:1;1090;1083:12;1042:55;1129:2;1116:16;1151:2;1147;1144:10;1141:36;;;1157:18;;:::i;:::-;1232:2;1226:9;1200:2;1286:13;;-1:-1:-1;;1282:22:59;;;1306:2;1278:31;1274:40;1262:53;;;1330:18;;;1350:22;;;1327:46;1324:72;;;1376:18;;:::i;:::-;1416:10;1412:2;1405:22;1451:2;1443:6;1436:18;1493:7;1486:4;1481:2;1477;1473:11;1469:22;1466:35;1463:55;;;1514:1;1511;1504:12;1463:55;1574:2;1567:4;1563:2;1559:13;1552:4;1544:6;1540:17;1527:50;1621:1;1614:4;1609:2;1601:6;1597:15;1593:26;1586:37;1642:6;1632:16;;;;;;;1667:40;1701:4;1690:9;1686:20;1667:40;:::i;:::-;1657:50;;1726:37;1759:2;1748:9;1744:18;1726:37;:::i;:::-;1716:47;;691:1078;;;;;:::o;2492:250::-;2577:1;2587:113;2601:6;2598:1;2595:13;2587:113;;;2677:11;;;2671:18;2658:11;;;2651:39;2623:2;2616:10;2587:113;;;-1:-1:-1;;2734:1:59;2716:16;;2709:27;2492:250::o;2747:461::-;3009:31;3004:3;2997:44;2979:3;3070:6;3064:13;3086:75;3154:6;3149:2;3144:3;3140:12;3133:4;3125:6;3121:17;3086:75;:::i;:::-;3181:16;;;;3199:2;3177:25;;2747:461;-1:-1:-1;;2747:461:59:o;3213:271::-;3255:3;3293:5;3287:12;3320:6;3315:3;3308:19;3336:76;3405:6;3398:4;3393:3;3389:14;3382:4;3375:5;3371:16;3336:76;:::i;:::-;3466:2;3445:15;-1:-1:-1;;3441:29:59;3432:39;;;;3473:4;3428:50;;3213:271;-1:-1:-1;;3213:271:59:o;3489:383::-;3686:2;3675:9;3668:21;3649:4;3712:45;3753:2;3742:9;3738:18;3730:6;3712:45;:::i;:::-;3805:9;3797:6;3793:22;3788:2;3777:9;3773:18;3766:50;3833:33;3859:6;3851;3833:33;:::i;:::-;3825:41;3489:383;-1:-1:-1;;;;;3489:383:59:o;4694:1462::-;5355:3;5367:21;;;5424:1;5404:18;;;5397:29;;;-1:-1:-1;;;5457:3:59;5442:19;;5435:35;5489:3;5523:4;5508:20;;5501:32;;;5549:18;;5542:29;-1:-1:-1;;;5602:3:59;5587:19;;5580:35;-1:-1:-1;;;;;1840:31:59;;5688:2;5673:18;;1828:44;-1:-1:-1;5634:3:59;3953:18;3942:30;;5742:2;5727:18;;3930:43;4065:6;4054:18;;5801:3;5786:19;;4042:31;-1:-1:-1;;;;;1840:31:59;;5857:3;5842:19;;1828:44;4172:12;;-1:-1:-1;;;;;4168:47:59;5931:3;5916:19;;;4156:60;;;;4269:4;4258:16;;4252:23;4277:10;4248:40;4232:14;;;4225:64;4335:4;4324:16;;4318:23;4360:18;4410:21;;;4394:14;;;4387:45;4485:4;4474:16;;4468:23;4464:32;;4448:14;;;4441:56;4550:4;4539:16;;4533:23;4529:32;;4513:14;;;4506:56;4615:4;4604:16;;4598:23;4594:32;4578:14;;;4571:56;4665:16;;4659:23;4643:14;;;4636:47;-1:-1:-1;;;;;1840:31:59;;5987:3;5972:19;;1828:44;6029:2;6023:3;6012:9;6008:19;6001:31;6049:45;6090:2;6079:9;6075:18;6067:6;6049:45;:::i;:::-;6041:53;;;6103:47;6145:3;6134:9;6130:19;6122:6;-1:-1:-1;;;;;1840:31:59;1828:44;;1774:104;6103:47;4694:1462;;;;;;;;;;;:::o;6161:290::-;6231:6;6284:2;6272:9;6263:7;6259:23;6255:32;6252:52;;;6300:1;6297;6290:12;6252:52;6326:16;;-1:-1:-1;;;;;6371:31:59;;6361:42;;6351:70;;6417:1;6414;6407:12;6351:70;6440:5;6161:290;-1:-1:-1;;;6161:290:59:o;6456:127::-;6517:10;6512:3;6508:20;6505:1;6498:31;6548:4;6545:1;6538:15;6572:4;6569:1;6562:15;6588:125;6653:9;;;6674:10;;;6671:36;;;6687:18;;:::i;:::-;6588:125;;;;:::o;6718:217::-;6758:1;6784;6774:132;;6828:10;6823:3;6819:20;6816:1;6809:31;6863:4;6860:1;6853:15;6891:4;6888:1;6881:15;6774:132;-1:-1:-1;6920:9:59;;6718:217::o;6940:168::-;7013:9;;;7044;;7061:15;;;7055:22;;7041:37;7031:71;;7082:18;;:::i",
    "linkReferences": {},
    "immutableReferences": {
      "30591": [
        {
          "start": 75,
          "length": 32
        }
      ],
      "30596": [
        {
          "start": 133,
          "length": 32
        }
      ]
    }
  },
  "methodIdentifiers": {
    "DEFAULT_ADMIN_ROLE()": "a217fddf",
    "MINTER_ROLE()": "d5391393",
    "newDrop(string,uint104,uint64)": "eb3e312e"
  },
  "rawMetadata": "{\"compiler\":{\"version\":\"0.8.20+commit.a1b79de6\"},\"language\":\"Solidity\",\"output\":{\"abi\":[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_metadataRenderer\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"DEFAULT_ADMIN_ROLE\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"MINTER_ROLE\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"dsp\",\"type\":\"string\"},{\"internalType\":\"uint104\",\"name\":\"price\",\"type\":\"uint104\"},{\"internalType\":\"uint64\",\"name\":\"editionSize\",\"type\":\"uint64\"}],\"name\":\"newDrop\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}],\"devdoc\":{\"kind\":\"dev\",\"methods\":{},\"version\":1},\"userdoc\":{\"kind\":\"user\",\"methods\":{},\"version\":1}},\"settings\":{\"compilationTarget\":{\"src/SoundDropCreator.sol\":\"SoundDropCreator\"},\"evmVersion\":\"paris\",\"libraries\":{},\"metadata\":{\"bytecodeHash\":\"ipfs\"},\"optimizer\":{\"enabled\":true,\"runs\":200},\"remappings\":[\":@openzeppelin/contracts-upgradeable/=lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/\",\":@openzeppelin/contracts/=lib/zora-drops-contracts/lib/openzeppelin-contracts/contracts/\",\":ERC721A-Upgradeable/=lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/\",\":base64/=lib/zora-drops-contracts/lib/base64/\",\":ds-test/=lib/forge-std/lib/ds-test/src/\",\":erc721a-upgradeable/=lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/\",\":forge-std/=lib/forge-std/src/\",\":openzeppelin-contracts-upgradeable/=lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/\",\":openzeppelin-contracts/=lib/zora-drops-contracts/lib/openzeppelin-contracts/contracts/\",\":zipped-contracts/=lib/zipped-contracts/\",\":zora-drops-contracts/=lib/zora-drops-contracts/src/\"]},\"sources\":{\"lib/forge-std/src/console.sol\":{\"keccak256\":\"0x91d5413c2434ca58fd278b6e1e79fd98d10c83931cc2596a6038eee4daeb34ba\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://91ccea707361e48b9b7a161fe81f496b9932bc471e9c4e4e1e9c283f2453cc70\",\"dweb:/ipfs/QmcB66sZhQ6Kz7MUHcLE78YXRUZxoZnnxZjN6yATsbB2ec\"]},\"lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/ERC721AUpgradeable.sol\":{\"keccak256\":\"0x09f0f04dc4afd6e4e5c2c297c0ef667425fba3b72e5f7eb49cff730e302f66b9\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://6fc9aa5cdd560666b104af810a83c221684291518fbedefdf4a246d86e9bc7b4\",\"dweb:/ipfs/QmVFzLRvLKt3MJ2Ta96tU7SNtFcoVsFZuv1qqYSHqDbfq4\"]},\"lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/IERC721AUpgradeable.sol\":{\"keccak256\":\"0x761343df9ec8e5a785ac31bd71231abde512731d39a661589e9985b4a31afd42\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://ecb7dde639c588b68e6d2fa88b0cd6e4a7fa8e8e976a9c92947a2c1dc07f30ab\",\"dweb:/ipfs/QmW47sC5tG41dA9ba1jWDBRq5U1ASTQbkw4N4XCY6HYLSB\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol\":{\"keccak256\":\"0xe7924d4b22ae4a764da606d6967417f50fd0d09d59deb54f5faefac8d145e81d\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://34feefd84ca432b5d12c593f297bd2fc93b13ab70ad46c7ccab61cb772ea2e40\",\"dweb:/ipfs/QmQ6sK6wqDAVTjcd7sjkKuLgWvRKU2HQoKrLWwx81H48nB\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/access/IAccessControlUpgradeable.sol\":{\"keccak256\":\"0xb8f5302f12138c5561362e88a78d061573e6298b7a1a5afe84a1e2c8d4d5aeaa\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://740cf4dc535e3082560cf5a031473029f322690fc8037fe9d5e3a8bef42e757c\",\"dweb:/ipfs/QmTQxFdfxcaueQa23VX34wAPqzruZbkzyeN58tZK2yav2b\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/interfaces/IERC2981Upgradeable.sol\":{\"keccak256\":\"0xf710fb524203921ca2fca7201672900fbfb354a37b56dd3f4f2e1592b3edb999\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://e01e4cb3900882f32553c918886fa2f509e1a3e2a75fab6b3a5486423b00f8f4\",\"dweb:/ipfs/QmQh7wmu2bgudYE99vy7VKLB7NVRBFoH5tLwR6zxtgsKRP\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/interfaces/draft-IERC1822Upgradeable.sol\":{\"keccak256\":\"0x77c89f893e403efc6929ba842b7ccf6534d4ffe03afe31670b4a528c0ad78c0f\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://496bd9b3df2455d571018c09f0c6badd29713fdeb907c6aa09d8d28cb603f053\",\"dweb:/ipfs/QmXdJDyYs6WMwMh21dez2BYPxhSUaUYFMDtVNcn2cgFR79\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol\":{\"keccak256\":\"0x315887e846f1e5f8d8fa535a229d318bb9290aaa69485117f1ee8a9a6b3be823\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://29dda00da6d269685b555e710e4abf1c3eb6d00c15b888a7880a2f8dd3c4fdc2\",\"dweb:/ipfs/QmSqcjtdECygtT1Gy7uEo42x8542srpgGEeKKHfcnQqXgn\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/beacon/IBeaconUpgradeable.sol\":{\"keccak256\":\"0x24b86ac8c005b8c654fbf6ac34a5a4f61580d7273541e83e013e89d66fbf0908\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://4dbfe1a3b3b3fb64294ce41fd2ad362e7b7012208117864f42c1a67620a6d5c1\",\"dweb:/ipfs/QmVMU5tWt7zBQMmf5cpMX8UMHV86T3kFeTxBTBjFqVWfoJ\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol\":{\"keccak256\":\"0x372b0bc04e3b4c074559bbbfb1317afddb56de5504158ca25a7f9cd403980445\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://88b812365459a042c2aab5c689ff723098e0e19cb372718d3dd028b3c406e4f6\",\"dweb:/ipfs/QmTsLrMYzPjnB85pyAy85NNcBg64RPVueJARzwNg9xMyR1\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol\":{\"keccak256\":\"0x6e36e9b4b71de699c2f3f0d4e4d1aa0b35da99a26e8d5b91ef09ba234b4ef270\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://abfa467c53a0d60b4d09bf04aa952b1d1d44e5766fcc053aace078d7859b8419\",\"dweb:/ipfs/QmebVTZpyNxYfKYTuLMywzEJTdc1Ca8ME4xm3kR9gQgToG\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol\":{\"keccak256\":\"0x8cc03c5ac17e8a7396e487cda41fc1f1dfdb91db7d528e6da84bee3b6dd7e167\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://607818f1b44548c2d8268176f73cdb290e1faed971b1061930d92698366e2a11\",\"dweb:/ipfs/QmQibMe3r5no95b6q7isGT5R75V8xSofWEDLXzp95b7LgZ\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/IERC721ReceiverUpgradeable.sol\":{\"keccak256\":\"0x6c4dd0c916c4d69014b1a430f5803d3ea1f35c1a8021aefafde55ca4c2d20c2a\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://93fd17a1502ac391fd929e9c585032efed0b2ed1fb6fe6026dbc44621538b84d\",\"dweb:/ipfs/Qmd3S9HaNGe83wctpj7Bvn6p2veG5P6QH1nPcRuKNJfUqN\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/IERC721Upgradeable.sol\":{\"keccak256\":\"0x714a33fd66816f608f6eda908da24eb6009eee50adf4062c86639d4fe508a7b6\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://1222806a46ee6d877cff1f609cdb548271a0ae85228716c8d1427462a16bd59b\",\"dweb:/ipfs/QmZVjwuTFqhoFBuug3fvHFVC5Y9ompwdHMwUy5upevMfJ5\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/extensions/IERC721MetadataUpgradeable.sol\":{\"keccak256\":\"0x95a471796eb5f030fdc438660bebec121ad5d063763e64d92376ffb4b5ce8b70\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://4ffbd627e6958983d288801acdedbf3491ee0ebf1a430338bce47c96481ce9e3\",\"dweb:/ipfs/QmUM1vpmNgBV34sYf946SthDJNGhwwqjoRggmj4TUUQmdB\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/AddressUpgradeable.sol\":{\"keccak256\":\"0x55cf2bd9fc76704ddcdc19834cd288b7de00fc0f298a40ea16a954ae8991db2d\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://37e4df53c8d2e3c1062c1c7b2c17366db7de03bfd2559d340ca95c588aa49c2f\",\"dweb:/ipfs/QmQ9vsG3o4wED3FRogiSUhdzJvZSjjYFtydzXvFEJtgZk4\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol\":{\"keccak256\":\"0x963ea7f0b48b032eef72fe3a7582edf78408d6f834115b9feadd673a4d5bd149\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://d6520943ea55fdf5f0bafb39ed909f64de17051bc954ff3e88c9e5621412c79c\",\"dweb:/ipfs/QmWZ4rAKTQbNG2HxGs46AcTXShsVytKeLs7CUCdCSv5N7a\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/StorageSlotUpgradeable.sol\":{\"keccak256\":\"0x422c3d27d0d5681cea93acbb0dcb175fa5b461b5b7731da7ff77e51f0f0174c7\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://feb47206935cf956f60ffd76b8bad047102c7acbf2aab10157a235b7af66fa39\",\"dweb:/ipfs/QmZQ39kpPhCdN9fyZ7BMwnK26tHjiP6QZDeL8tMSPDjxan\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/StringsUpgradeable.sol\":{\"keccak256\":\"0x398d3323c1932a5986bf36be7c57593e121e69d5db5b6574b4ee0d031443de37\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://8b268304e03daf22c349abe3c318bc6a6badd6542d62311716ab401eec745f78\",\"dweb:/ipfs/QmNYy2sc2RoTjDhyT6HAibmeDGqfhDiDpsWRbHFHoGVHLr\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/cryptography/MerkleProofUpgradeable.sol\":{\"keccak256\":\"0xa11b70c83ab745c0fbfe48e2edccbb9ded3de3ba9dd3b92ac2814ca5555179f0\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://f337bba3063f7f6750e12bbdaf249c9c6ee56478463da15473b07a8877360685\",\"dweb:/ipfs/QmcLC3GiQ8dkKqapfX7urbtfvYEed1VuvWJi6Xk7gDtHf7\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol\":{\"keccak256\":\"0x9a3b990bd56d139df3e454a9edf1c64668530b5a77fc32eb063bc206f958274a\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://0895399d170daab2d69b4c43a0202e5a07f2e67a93b26e3354dcbedb062232f7\",\"dweb:/ipfs/QmUM1VH3XDk559Dsgh4QPvupr3YVKjz87HrSyYzzVFZbxw\"]},\"lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/IERC165Upgradeable.sol\":{\"keccak256\":\"0xc6cef87559d0aeffdf0a99803de655938a7779ec0a3cd5d4383483ad85565a09\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://92ad7e572cf44e6b4b37631b44b62f9eb9fb1cf14d9ce51c1504d5dc7ccaf758\",\"dweb:/ipfs/QmcnbqX85tsWnUXPmtuPLE4SczME2sJaTfmqEFkuAJvWhy\"]},\"lib/zora-drops-contracts/src/ERC721Drop.sol\":{\"keccak256\":\"0xe18f5d277638dde63549d7d031722ad50581d47e34cd65aba56c206729fbcd31\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://be9bdfa80e0951f815444c1980dda790f138432a0fcdd49dfe5744daab956bc5\",\"dweb:/ipfs/Qme7JL1LT7FF5rJY3FW7SnRynvBRWtQjGTNqWwNDtpZYa9\"]},\"lib/zora-drops-contracts/src/interfaces/IERC721Drop.sol\":{\"keccak256\":\"0xef9ba6c977f345b27f0bddb8196359b46c39b949eec5ba5214d259bd757e33e6\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://730ab86f6a71e75e2c6ad9786ed2edc46d4e93e59cd713833d6e09ea0828fd33\",\"dweb:/ipfs/QmfHwtNcTL6FZGzy6jdZapNAL4Hw1uKS1x4Ry8ygxceBY6\"]},\"lib/zora-drops-contracts/src/interfaces/IFactoryUpgradeGate.sol\":{\"keccak256\":\"0x04e26e7e753faa9433dc2af8c6371fb8ef61a3c967aaa119bf7cc14f998c90b1\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://4603628a3d23c7720ae511b414962eb2216e16f03c79441ea49219f162f27c18\",\"dweb:/ipfs/QmYLDTws4LxcXGYrK4uuTFXvGQgnEQwAPUJPR2BhHzfsdo\"]},\"lib/zora-drops-contracts/src/interfaces/IMetadataRenderer.sol\":{\"keccak256\":\"0x028ca6812523430e51bea0d94e262061bcac07918eff7fa4e632d514cfc14fa4\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://9b36c0ab8ee6e91e4c0e728e6139f71df1cb80c602ee0c70563850900a945370\",\"dweb:/ipfs/QmZqgJAidibh69iDdHKdCgh7WErw8kadoyePPS1h6WqwPg\"]},\"lib/zora-drops-contracts/src/interfaces/IOperatorFilterRegistry.sol\":{\"keccak256\":\"0x1ee4c3631e723b0154901bd07a2aceea22131d412f9f4165a8758feefab7b5c6\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://27786a9acec5e3e7cbf4f228ce9767faaca0e78d1289be0d75a066015e2a656c\",\"dweb:/ipfs/QmaZvWGszsd8wxhKBw3vWMu6bS3CKEpgZGBrLxqTvURr6s\"]},\"lib/zora-drops-contracts/src/interfaces/IOwnable.sol\":{\"keccak256\":\"0xba93a359629e4a26fe553e07c20fb7b5c58ab0e4ac00bed71f06d5e79059f423\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://48b94f75f9952ef4b17c85da4c85aa25506552b45c65401b4d02a3f76aae6b86\",\"dweb:/ipfs/QmNwnj6jqMhf6Urg2tJ47ZfzTRwpBkiGCGwYE1sf4wJLdU\"]},\"lib/zora-drops-contracts/src/interfaces/IZoraFeeManager.sol\":{\"keccak256\":\"0xc683d636ee5be3d1110fc9463d17145f1156fa04b54063fc02401d0c075084b5\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://67c51a17b71037037ee1012469a489aa27725a7a61bc4d28fae7658df53f6030\",\"dweb:/ipfs/QmbYwDstxc6bi8TTErfdXei9oDYkVjVegJaXboA8uSXG59\"]},\"lib/zora-drops-contracts/src/metadata/MetadataRenderAdminCheck.sol\":{\"keccak256\":\"0x4585bbeec55ef521b3412e3195a8a568d4cea4f8b794d15b3a2bb68f83fbed8c\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://75b7c57db0800e26afeadf9814859cdd8585888dee016a2ba6aabea29949dc62\",\"dweb:/ipfs/QmZQB4WoZ1kwPFUgnG2gcJVYG5pUsirGoLQhzF5ub1T1pU\"]},\"lib/zora-drops-contracts/src/storage/ERC721DropStorageV1.sol\":{\"keccak256\":\"0xe6f5a209fc6cbd0a775d86968e31a0aa3d46ab2b5edfcaeda6b9711175645c02\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://37501ec631b4cc81e5f6cc91ae2b0c9255c099b23be549a8d56c79c5aefe7055\",\"dweb:/ipfs/QmSYVCu3tzSsW1pdUd36mvGFdaVSmpWfLeYHENyvAiVdX8\"]},\"lib/zora-drops-contracts/src/utils/FundsReceiver.sol\":{\"keccak256\":\"0x09d04ed0af6f95cd6c958c877d22cb953f538cd90b96008a619bbb2082a17e43\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://f095e5cf82457698f2b6b385a750270cf626dd245f5886beede827b9eaa0bd22\",\"dweb:/ipfs/QmSbegrPAumh2c3RsrJLw1vYKR5kSFjXwbod5Byi7ksYLa\"]},\"lib/zora-drops-contracts/src/utils/OwnableSkeleton.sol\":{\"keccak256\":\"0x4146c66a6287c3bef63c7ce65613eadcc7d64392623d3ab1713ef3d60c6bfc3d\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://09a1b5c9732242bf0d560fe910ea6c9525b2f4ab38b2a0acafd8310c6f785ae4\",\"dweb:/ipfs/Qmd4FoKnJwMLvFPQmQNRrQP7NzYjN9GwQPpw4rBphQcnU6\"]},\"lib/zora-drops-contracts/src/utils/Version.sol\":{\"keccak256\":\"0x4f3c7d0bdbc3c4b7e6d96d7680625967a41470b78c3679b4e8631df7dd5b5ff9\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://d7259fbfd1cb12bcec3f984012e30228ef74bdd343349037c95221d7bd9c5b4c\",\"dweb:/ipfs/QmYMiqfszdMBypLPfNpWZKrch7CY8jCf6u71FbG2ydxyzQ\"]},\"src/Base64.sol\":{\"keccak256\":\"0x37fc11556e8751dd0e489fa274e54df46b2134dc0b1e0b2669711f6e7fc38ae7\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://cdec5395e9506760beb9dd459c6f21a75ca01cce14de2f4cf9c30c716aa3786f\",\"dweb:/ipfs/QmcYm1xKgukQSmVRgJPEkTxXVLbvz8H7mKdFggTWgFWgwJ\"]},\"src/Conversion.sol\":{\"keccak256\":\"0x99917e2b1ce3cedd0a8bc5d221f223a0858f09a7f109d34399daf319bcd87cee\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://b35dce693d44c069ed04b9584a03b8d64bc843a409e0923634f55bc68dece18a\",\"dweb:/ipfs/QmZBb26R8is9BiMuAi818za2R8TKaxGVGV7L3qwuHCD79a\"]},\"src/ERC721DropMinterInterface.sol\":{\"keccak256\":\"0x1109a2485c5010634008babe3f78f25e759455f9f6e8cbeb2b0163f6e0ea9a8a\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://27d6f2d50f44a5204d0f972a664bc1e3e14830b2f4e712e64938c11606d42f88\",\"dweb:/ipfs/QmP1rC8zDSasJtQPzyT2wJyKF6GgvspWT5udz4e3ERhraE\"]},\"src/IZoraNFTCreator.sol\":{\"keccak256\":\"0x10832882b30ce796e48cb6940aefd0dcc0f02eee587ed043607bddbe540d3b25\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://b8fd7849e3b93e66984b2d0aa660e6fa826f71fa7531628b2b1464c859cfeff0\",\"dweb:/ipfs/Qmcuap66TQ8cq2pTbYewD4c6KzzcdN5UJBxwMjyVHwnHXF\"]},\"src/PatchMinter.sol\":{\"keccak256\":\"0x155cc4c6e25a22e23a4ec8c318b0b82c466f22d5834f83af7db2c21f4ce32a04\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://6be036305a94bebf6a4705978b04e0114a813e71341657b08e031c96229a91cf\",\"dweb:/ipfs/QmPUwpjzaqE6Aj7smKTqmXbg7kwMN8U4zsRgFQx57D6Rrn\"]},\"src/SoundDropCreator.sol\":{\"keccak256\":\"0xcbcd2d330f355b7a51a40987e68896044284dcd2eacc0215b8072d9a2763f1b2\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://5222eef00aaa973a8f6dd0f2a6e41c4cde702e61cbf250c1a89c2b13f7aa15bb\",\"dweb:/ipfs/QmXZs5tcfqELzdhnBGnKyey1JfNu8aSoDYGGN8cezRB9VK\"]},\"src/ZenMetadataRenderer.sol\":{\"keccak256\":\"0xb192fe087e6052568d6bf1d360b25e673a231ea83c4a8e674fb0c4c219a8e031\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://1b1497bd191dab9916fe1fb914052be34d5ccd2a9077e4ab3831238aff524032\",\"dweb:/ipfs/QmYHGNDZH2Uf7He1qTsvpjSfJhkMJxkoScAMhhqRPBmSUR\"]}},\"version\":1}",
  "metadata": {
    "compiler": {
      "version": "0.8.20+commit.a1b79de6"
    },
    "language": "Solidity",
    "output": {
      "abi": [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_metadataRenderer",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "stateMutability": "view",
          "type": "function",
          "name": "DEFAULT_ADMIN_ROLE",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ]
        },
        {
          "inputs": [],
          "stateMutability": "view",
          "type": "function",
          "name": "MINTER_ROLE",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ]
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "dsp",
              "type": "string"
            },
            {
              "internalType": "uint104",
              "name": "price",
              "type": "uint104"
            },
            {
              "internalType": "uint64",
              "name": "editionSize",
              "type": "uint64"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function",
          "name": "newDrop",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ]
        }
      ],
      "devdoc": {
        "kind": "dev",
        "methods": {},
        "version": 1
      },
      "userdoc": {
        "kind": "user",
        "methods": {},
        "version": 1
      }
    },
    "settings": {
      "remappings": [
        "@openzeppelin/contracts-upgradeable/=lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/",
        "@openzeppelin/contracts/=lib/zora-drops-contracts/lib/openzeppelin-contracts/contracts/",
        "ERC721A-Upgradeable/=lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/",
        "base64/=lib/zora-drops-contracts/lib/base64/",
        "ds-test/=lib/forge-std/lib/ds-test/src/",
        "erc721a-upgradeable/=lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/",
        "forge-std/=lib/forge-std/src/",
        "openzeppelin-contracts-upgradeable/=lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/",
        "openzeppelin-contracts/=lib/zora-drops-contracts/lib/openzeppelin-contracts/contracts/",
        "zipped-contracts/=lib/zipped-contracts/",
        "zora-drops-contracts/=lib/zora-drops-contracts/src/"
      ],
      "optimizer": {
        "enabled": true,
        "runs": 200
      },
      "metadata": {
        "bytecodeHash": "ipfs"
      },
      "compilationTarget": {
        "src/SoundDropCreator.sol": "SoundDropCreator"
      },
      "libraries": {}
    },
    "sources": {
      "lib/forge-std/src/console.sol": {
        "keccak256": "0x91d5413c2434ca58fd278b6e1e79fd98d10c83931cc2596a6038eee4daeb34ba",
        "urls": [
          "bzz-raw://91ccea707361e48b9b7a161fe81f496b9932bc471e9c4e4e1e9c283f2453cc70",
          "dweb:/ipfs/QmcB66sZhQ6Kz7MUHcLE78YXRUZxoZnnxZjN6yATsbB2ec"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/ERC721AUpgradeable.sol": {
        "keccak256": "0x09f0f04dc4afd6e4e5c2c297c0ef667425fba3b72e5f7eb49cff730e302f66b9",
        "urls": [
          "bzz-raw://6fc9aa5cdd560666b104af810a83c221684291518fbedefdf4a246d86e9bc7b4",
          "dweb:/ipfs/QmVFzLRvLKt3MJ2Ta96tU7SNtFcoVsFZuv1qqYSHqDbfq4"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/ERC721A-Upgradeable/contracts/IERC721AUpgradeable.sol": {
        "keccak256": "0x761343df9ec8e5a785ac31bd71231abde512731d39a661589e9985b4a31afd42",
        "urls": [
          "bzz-raw://ecb7dde639c588b68e6d2fa88b0cd6e4a7fa8e8e976a9c92947a2c1dc07f30ab",
          "dweb:/ipfs/QmW47sC5tG41dA9ba1jWDBRq5U1ASTQbkw4N4XCY6HYLSB"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol": {
        "keccak256": "0xe7924d4b22ae4a764da606d6967417f50fd0d09d59deb54f5faefac8d145e81d",
        "urls": [
          "bzz-raw://34feefd84ca432b5d12c593f297bd2fc93b13ab70ad46c7ccab61cb772ea2e40",
          "dweb:/ipfs/QmQ6sK6wqDAVTjcd7sjkKuLgWvRKU2HQoKrLWwx81H48nB"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/access/IAccessControlUpgradeable.sol": {
        "keccak256": "0xb8f5302f12138c5561362e88a78d061573e6298b7a1a5afe84a1e2c8d4d5aeaa",
        "urls": [
          "bzz-raw://740cf4dc535e3082560cf5a031473029f322690fc8037fe9d5e3a8bef42e757c",
          "dweb:/ipfs/QmTQxFdfxcaueQa23VX34wAPqzruZbkzyeN58tZK2yav2b"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/interfaces/IERC2981Upgradeable.sol": {
        "keccak256": "0xf710fb524203921ca2fca7201672900fbfb354a37b56dd3f4f2e1592b3edb999",
        "urls": [
          "bzz-raw://e01e4cb3900882f32553c918886fa2f509e1a3e2a75fab6b3a5486423b00f8f4",
          "dweb:/ipfs/QmQh7wmu2bgudYE99vy7VKLB7NVRBFoH5tLwR6zxtgsKRP"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/interfaces/draft-IERC1822Upgradeable.sol": {
        "keccak256": "0x77c89f893e403efc6929ba842b7ccf6534d4ffe03afe31670b4a528c0ad78c0f",
        "urls": [
          "bzz-raw://496bd9b3df2455d571018c09f0c6badd29713fdeb907c6aa09d8d28cb603f053",
          "dweb:/ipfs/QmXdJDyYs6WMwMh21dez2BYPxhSUaUYFMDtVNcn2cgFR79"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol": {
        "keccak256": "0x315887e846f1e5f8d8fa535a229d318bb9290aaa69485117f1ee8a9a6b3be823",
        "urls": [
          "bzz-raw://29dda00da6d269685b555e710e4abf1c3eb6d00c15b888a7880a2f8dd3c4fdc2",
          "dweb:/ipfs/QmSqcjtdECygtT1Gy7uEo42x8542srpgGEeKKHfcnQqXgn"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/beacon/IBeaconUpgradeable.sol": {
        "keccak256": "0x24b86ac8c005b8c654fbf6ac34a5a4f61580d7273541e83e013e89d66fbf0908",
        "urls": [
          "bzz-raw://4dbfe1a3b3b3fb64294ce41fd2ad362e7b7012208117864f42c1a67620a6d5c1",
          "dweb:/ipfs/QmVMU5tWt7zBQMmf5cpMX8UMHV86T3kFeTxBTBjFqVWfoJ"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol": {
        "keccak256": "0x372b0bc04e3b4c074559bbbfb1317afddb56de5504158ca25a7f9cd403980445",
        "urls": [
          "bzz-raw://88b812365459a042c2aab5c689ff723098e0e19cb372718d3dd028b3c406e4f6",
          "dweb:/ipfs/QmTsLrMYzPjnB85pyAy85NNcBg64RPVueJARzwNg9xMyR1"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol": {
        "keccak256": "0x6e36e9b4b71de699c2f3f0d4e4d1aa0b35da99a26e8d5b91ef09ba234b4ef270",
        "urls": [
          "bzz-raw://abfa467c53a0d60b4d09bf04aa952b1d1d44e5766fcc053aace078d7859b8419",
          "dweb:/ipfs/QmebVTZpyNxYfKYTuLMywzEJTdc1Ca8ME4xm3kR9gQgToG"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol": {
        "keccak256": "0x8cc03c5ac17e8a7396e487cda41fc1f1dfdb91db7d528e6da84bee3b6dd7e167",
        "urls": [
          "bzz-raw://607818f1b44548c2d8268176f73cdb290e1faed971b1061930d92698366e2a11",
          "dweb:/ipfs/QmQibMe3r5no95b6q7isGT5R75V8xSofWEDLXzp95b7LgZ"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/IERC721ReceiverUpgradeable.sol": {
        "keccak256": "0x6c4dd0c916c4d69014b1a430f5803d3ea1f35c1a8021aefafde55ca4c2d20c2a",
        "urls": [
          "bzz-raw://93fd17a1502ac391fd929e9c585032efed0b2ed1fb6fe6026dbc44621538b84d",
          "dweb:/ipfs/Qmd3S9HaNGe83wctpj7Bvn6p2veG5P6QH1nPcRuKNJfUqN"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/IERC721Upgradeable.sol": {
        "keccak256": "0x714a33fd66816f608f6eda908da24eb6009eee50adf4062c86639d4fe508a7b6",
        "urls": [
          "bzz-raw://1222806a46ee6d877cff1f609cdb548271a0ae85228716c8d1427462a16bd59b",
          "dweb:/ipfs/QmZVjwuTFqhoFBuug3fvHFVC5Y9ompwdHMwUy5upevMfJ5"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/extensions/IERC721MetadataUpgradeable.sol": {
        "keccak256": "0x95a471796eb5f030fdc438660bebec121ad5d063763e64d92376ffb4b5ce8b70",
        "urls": [
          "bzz-raw://4ffbd627e6958983d288801acdedbf3491ee0ebf1a430338bce47c96481ce9e3",
          "dweb:/ipfs/QmUM1vpmNgBV34sYf946SthDJNGhwwqjoRggmj4TUUQmdB"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/AddressUpgradeable.sol": {
        "keccak256": "0x55cf2bd9fc76704ddcdc19834cd288b7de00fc0f298a40ea16a954ae8991db2d",
        "urls": [
          "bzz-raw://37e4df53c8d2e3c1062c1c7b2c17366db7de03bfd2559d340ca95c588aa49c2f",
          "dweb:/ipfs/QmQ9vsG3o4wED3FRogiSUhdzJvZSjjYFtydzXvFEJtgZk4"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol": {
        "keccak256": "0x963ea7f0b48b032eef72fe3a7582edf78408d6f834115b9feadd673a4d5bd149",
        "urls": [
          "bzz-raw://d6520943ea55fdf5f0bafb39ed909f64de17051bc954ff3e88c9e5621412c79c",
          "dweb:/ipfs/QmWZ4rAKTQbNG2HxGs46AcTXShsVytKeLs7CUCdCSv5N7a"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/StorageSlotUpgradeable.sol": {
        "keccak256": "0x422c3d27d0d5681cea93acbb0dcb175fa5b461b5b7731da7ff77e51f0f0174c7",
        "urls": [
          "bzz-raw://feb47206935cf956f60ffd76b8bad047102c7acbf2aab10157a235b7af66fa39",
          "dweb:/ipfs/QmZQ39kpPhCdN9fyZ7BMwnK26tHjiP6QZDeL8tMSPDjxan"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/StringsUpgradeable.sol": {
        "keccak256": "0x398d3323c1932a5986bf36be7c57593e121e69d5db5b6574b4ee0d031443de37",
        "urls": [
          "bzz-raw://8b268304e03daf22c349abe3c318bc6a6badd6542d62311716ab401eec745f78",
          "dweb:/ipfs/QmNYy2sc2RoTjDhyT6HAibmeDGqfhDiDpsWRbHFHoGVHLr"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/cryptography/MerkleProofUpgradeable.sol": {
        "keccak256": "0xa11b70c83ab745c0fbfe48e2edccbb9ded3de3ba9dd3b92ac2814ca5555179f0",
        "urls": [
          "bzz-raw://f337bba3063f7f6750e12bbdaf249c9c6ee56478463da15473b07a8877360685",
          "dweb:/ipfs/QmcLC3GiQ8dkKqapfX7urbtfvYEed1VuvWJi6Xk7gDtHf7"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol": {
        "keccak256": "0x9a3b990bd56d139df3e454a9edf1c64668530b5a77fc32eb063bc206f958274a",
        "urls": [
          "bzz-raw://0895399d170daab2d69b4c43a0202e5a07f2e67a93b26e3354dcbedb062232f7",
          "dweb:/ipfs/QmUM1VH3XDk559Dsgh4QPvupr3YVKjz87HrSyYzzVFZbxw"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/IERC165Upgradeable.sol": {
        "keccak256": "0xc6cef87559d0aeffdf0a99803de655938a7779ec0a3cd5d4383483ad85565a09",
        "urls": [
          "bzz-raw://92ad7e572cf44e6b4b37631b44b62f9eb9fb1cf14d9ce51c1504d5dc7ccaf758",
          "dweb:/ipfs/QmcnbqX85tsWnUXPmtuPLE4SczME2sJaTfmqEFkuAJvWhy"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/ERC721Drop.sol": {
        "keccak256": "0xe18f5d277638dde63549d7d031722ad50581d47e34cd65aba56c206729fbcd31",
        "urls": [
          "bzz-raw://be9bdfa80e0951f815444c1980dda790f138432a0fcdd49dfe5744daab956bc5",
          "dweb:/ipfs/Qme7JL1LT7FF5rJY3FW7SnRynvBRWtQjGTNqWwNDtpZYa9"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IERC721Drop.sol": {
        "keccak256": "0xef9ba6c977f345b27f0bddb8196359b46c39b949eec5ba5214d259bd757e33e6",
        "urls": [
          "bzz-raw://730ab86f6a71e75e2c6ad9786ed2edc46d4e93e59cd713833d6e09ea0828fd33",
          "dweb:/ipfs/QmfHwtNcTL6FZGzy6jdZapNAL4Hw1uKS1x4Ry8ygxceBY6"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IFactoryUpgradeGate.sol": {
        "keccak256": "0x04e26e7e753faa9433dc2af8c6371fb8ef61a3c967aaa119bf7cc14f998c90b1",
        "urls": [
          "bzz-raw://4603628a3d23c7720ae511b414962eb2216e16f03c79441ea49219f162f27c18",
          "dweb:/ipfs/QmYLDTws4LxcXGYrK4uuTFXvGQgnEQwAPUJPR2BhHzfsdo"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IMetadataRenderer.sol": {
        "keccak256": "0x028ca6812523430e51bea0d94e262061bcac07918eff7fa4e632d514cfc14fa4",
        "urls": [
          "bzz-raw://9b36c0ab8ee6e91e4c0e728e6139f71df1cb80c602ee0c70563850900a945370",
          "dweb:/ipfs/QmZqgJAidibh69iDdHKdCgh7WErw8kadoyePPS1h6WqwPg"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IOperatorFilterRegistry.sol": {
        "keccak256": "0x1ee4c3631e723b0154901bd07a2aceea22131d412f9f4165a8758feefab7b5c6",
        "urls": [
          "bzz-raw://27786a9acec5e3e7cbf4f228ce9767faaca0e78d1289be0d75a066015e2a656c",
          "dweb:/ipfs/QmaZvWGszsd8wxhKBw3vWMu6bS3CKEpgZGBrLxqTvURr6s"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IOwnable.sol": {
        "keccak256": "0xba93a359629e4a26fe553e07c20fb7b5c58ab0e4ac00bed71f06d5e79059f423",
        "urls": [
          "bzz-raw://48b94f75f9952ef4b17c85da4c85aa25506552b45c65401b4d02a3f76aae6b86",
          "dweb:/ipfs/QmNwnj6jqMhf6Urg2tJ47ZfzTRwpBkiGCGwYE1sf4wJLdU"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/interfaces/IZoraFeeManager.sol": {
        "keccak256": "0xc683d636ee5be3d1110fc9463d17145f1156fa04b54063fc02401d0c075084b5",
        "urls": [
          "bzz-raw://67c51a17b71037037ee1012469a489aa27725a7a61bc4d28fae7658df53f6030",
          "dweb:/ipfs/QmbYwDstxc6bi8TTErfdXei9oDYkVjVegJaXboA8uSXG59"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/metadata/MetadataRenderAdminCheck.sol": {
        "keccak256": "0x4585bbeec55ef521b3412e3195a8a568d4cea4f8b794d15b3a2bb68f83fbed8c",
        "urls": [
          "bzz-raw://75b7c57db0800e26afeadf9814859cdd8585888dee016a2ba6aabea29949dc62",
          "dweb:/ipfs/QmZQB4WoZ1kwPFUgnG2gcJVYG5pUsirGoLQhzF5ub1T1pU"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/storage/ERC721DropStorageV1.sol": {
        "keccak256": "0xe6f5a209fc6cbd0a775d86968e31a0aa3d46ab2b5edfcaeda6b9711175645c02",
        "urls": [
          "bzz-raw://37501ec631b4cc81e5f6cc91ae2b0c9255c099b23be549a8d56c79c5aefe7055",
          "dweb:/ipfs/QmSYVCu3tzSsW1pdUd36mvGFdaVSmpWfLeYHENyvAiVdX8"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/utils/FundsReceiver.sol": {
        "keccak256": "0x09d04ed0af6f95cd6c958c877d22cb953f538cd90b96008a619bbb2082a17e43",
        "urls": [
          "bzz-raw://f095e5cf82457698f2b6b385a750270cf626dd245f5886beede827b9eaa0bd22",
          "dweb:/ipfs/QmSbegrPAumh2c3RsrJLw1vYKR5kSFjXwbod5Byi7ksYLa"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/utils/OwnableSkeleton.sol": {
        "keccak256": "0x4146c66a6287c3bef63c7ce65613eadcc7d64392623d3ab1713ef3d60c6bfc3d",
        "urls": [
          "bzz-raw://09a1b5c9732242bf0d560fe910ea6c9525b2f4ab38b2a0acafd8310c6f785ae4",
          "dweb:/ipfs/Qmd4FoKnJwMLvFPQmQNRrQP7NzYjN9GwQPpw4rBphQcnU6"
        ],
        "license": "MIT"
      },
      "lib/zora-drops-contracts/src/utils/Version.sol": {
        "keccak256": "0x4f3c7d0bdbc3c4b7e6d96d7680625967a41470b78c3679b4e8631df7dd5b5ff9",
        "urls": [
          "bzz-raw://d7259fbfd1cb12bcec3f984012e30228ef74bdd343349037c95221d7bd9c5b4c",
          "dweb:/ipfs/QmYMiqfszdMBypLPfNpWZKrch7CY8jCf6u71FbG2ydxyzQ"
        ],
        "license": "MIT"
      },
      "src/Base64.sol": {
        "keccak256": "0x37fc11556e8751dd0e489fa274e54df46b2134dc0b1e0b2669711f6e7fc38ae7",
        "urls": [
          "bzz-raw://cdec5395e9506760beb9dd459c6f21a75ca01cce14de2f4cf9c30c716aa3786f",
          "dweb:/ipfs/QmcYm1xKgukQSmVRgJPEkTxXVLbvz8H7mKdFggTWgFWgwJ"
        ],
        "license": "MIT"
      },
      "src/Conversion.sol": {
        "keccak256": "0x99917e2b1ce3cedd0a8bc5d221f223a0858f09a7f109d34399daf319bcd87cee",
        "urls": [
          "bzz-raw://b35dce693d44c069ed04b9584a03b8d64bc843a409e0923634f55bc68dece18a",
          "dweb:/ipfs/QmZBb26R8is9BiMuAi818za2R8TKaxGVGV7L3qwuHCD79a"
        ],
        "license": "MIT"
      },
      "src/ERC721DropMinterInterface.sol": {
        "keccak256": "0x1109a2485c5010634008babe3f78f25e759455f9f6e8cbeb2b0163f6e0ea9a8a",
        "urls": [
          "bzz-raw://27d6f2d50f44a5204d0f972a664bc1e3e14830b2f4e712e64938c11606d42f88",
          "dweb:/ipfs/QmP1rC8zDSasJtQPzyT2wJyKF6GgvspWT5udz4e3ERhraE"
        ],
        "license": "MIT"
      },
      "src/IZoraNFTCreator.sol": {
        "keccak256": "0x10832882b30ce796e48cb6940aefd0dcc0f02eee587ed043607bddbe540d3b25",
        "urls": [
          "bzz-raw://b8fd7849e3b93e66984b2d0aa660e6fa826f71fa7531628b2b1464c859cfeff0",
          "dweb:/ipfs/Qmcuap66TQ8cq2pTbYewD4c6KzzcdN5UJBxwMjyVHwnHXF"
        ],
        "license": "MIT"
      },
      "src/PatchMinter.sol": {
        "keccak256": "0x155cc4c6e25a22e23a4ec8c318b0b82c466f22d5834f83af7db2c21f4ce32a04",
        "urls": [
          "bzz-raw://6be036305a94bebf6a4705978b04e0114a813e71341657b08e031c96229a91cf",
          "dweb:/ipfs/QmPUwpjzaqE6Aj7smKTqmXbg7kwMN8U4zsRgFQx57D6Rrn"
        ],
        "license": "MIT"
      },
      "src/SoundDropCreator.sol": {
        "keccak256": "0xcbcd2d330f355b7a51a40987e68896044284dcd2eacc0215b8072d9a2763f1b2",
        "urls": [
          "bzz-raw://5222eef00aaa973a8f6dd0f2a6e41c4cde702e61cbf250c1a89c2b13f7aa15bb",
          "dweb:/ipfs/QmXZs5tcfqELzdhnBGnKyey1JfNu8aSoDYGGN8cezRB9VK"
        ],
        "license": "MIT"
      },
      "src/ZenMetadataRenderer.sol": {
        "keccak256": "0xb192fe087e6052568d6bf1d360b25e673a231ea83c4a8e674fb0c4c219a8e031",
        "urls": [
          "bzz-raw://1b1497bd191dab9916fe1fb914052be34d5ccd2a9077e4ab3831238aff524032",
          "dweb:/ipfs/QmYHGNDZH2Uf7He1qTsvpjSfJhkMJxkoScAMhhqRPBmSUR"
        ],
        "license": "MIT"
      }
    },
    "version": 1
  },
  "ast": {
    "absolutePath": "src/SoundDropCreator.sol",
    "id": 30693,
    "exportedSymbols": {
      "Base64": [
        29780
      ],
      "Conversion": [
        30321
      ],
      "ERC721Drop": [
        28931
      ],
      "ERC721DropMinterInterface": [
        30349
      ],
      "IERC721AUpgradeable": [
        25574
      ],
      "IERC721Drop": [
        29203
      ],
      "IMetadataRenderer": [
        29250
      ],
      "IZoraNFTCreator": [
        30392
      ],
      "MetadataRenderAdminCheck": [
        29520
      ],
      "PatchMinter": [
        30575
      ],
      "SoundDropCreator": [
        30692
      ],
      "ZenMetadataRenderer": [
        31636
      ],
      "console": [
        15816
      ]
    },
    "nodeType": "SourceUnit",
    "src": "34:2302:52",
    "nodes": [
      {
        "id": 30577,
        "nodeType": "PragmaDirective",
        "src": "34:24:52",
        "nodes": [],
        "literals": [
          "solidity",
          "^",
          "0.8",
          ".10"
        ]
      },
      {
        "id": 30578,
        "nodeType": "ImportDirective",
        "src": "60:31:52",
        "nodes": [],
        "absolutePath": "src/IZoraNFTCreator.sol",
        "file": "./IZoraNFTCreator.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 30393,
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "id": 30579,
        "nodeType": "ImportDirective",
        "src": "92:27:52",
        "nodes": [],
        "absolutePath": "src/PatchMinter.sol",
        "file": "./PatchMinter.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 30576,
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "id": 30580,
        "nodeType": "ImportDirective",
        "src": "120:22:52",
        "nodes": [],
        "absolutePath": "src/Base64.sol",
        "file": "./Base64.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 29781,
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "id": 30582,
        "nodeType": "ImportDirective",
        "src": "143:76:52",
        "nodes": [],
        "absolutePath": "lib/zora-drops-contracts/src/interfaces/IERC721Drop.sol",
        "file": "zora-drops-contracts/interfaces/IERC721Drop.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 29204,
        "symbolAliases": [
          {
            "foreign": {
              "id": 30581,
              "name": "IERC721Drop",
              "nodeType": "Identifier",
              "overloadedDeclarations": [],
              "referencedDeclaration": 29203,
              "src": "151:11:52",
              "typeDescriptions": {}
            },
            "nameLocation": "-1:-1:-1"
          }
        ],
        "unitAlias": ""
      },
      {
        "id": 30584,
        "nodeType": "ImportDirective",
        "src": "220:46:52",
        "nodes": [],
        "absolutePath": "lib/forge-std/src/console.sol",
        "file": "forge-std/console.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 15817,
        "symbolAliases": [
          {
            "foreign": {
              "id": 30583,
              "name": "console",
              "nodeType": "Identifier",
              "overloadedDeclarations": [],
              "referencedDeclaration": 15816,
              "src": "228:7:52",
              "typeDescriptions": {}
            },
            "nameLocation": "-1:-1:-1"
          }
        ],
        "unitAlias": ""
      },
      {
        "id": 30586,
        "nodeType": "ImportDirective",
        "src": "267:63:52",
        "nodes": [],
        "absolutePath": "lib/zora-drops-contracts/src/ERC721Drop.sol",
        "file": "zora-drops-contracts/ERC721Drop.sol",
        "nameLocation": "-1:-1:-1",
        "scope": 30693,
        "sourceUnit": 28932,
        "symbolAliases": [
          {
            "foreign": {
              "id": 30585,
              "name": "ERC721Drop",
              "nodeType": "Identifier",
              "overloadedDeclarations": [],
              "referencedDeclaration": 28931,
              "src": "275:10:52",
              "typeDescriptions": {}
            },
            "nameLocation": "-1:-1:-1"
          }
        ],
        "unitAlias": ""
      },
      {
        "id": 30692,
        "nodeType": "ContractDefinition",
        "src": "332:2003:52",
        "nodes": [
          {
            "id": 30588,
            "nodeType": "VariableDeclaration",
            "src": "365:24:52",
            "nodes": [],
            "constant": false,
            "mutability": "mutable",
            "name": "metadataRenderer",
            "nameLocation": "373:16:52",
            "scope": 30692,
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_address",
              "typeString": "address"
            },
            "typeName": {
              "id": 30587,
              "name": "address",
              "nodeType": "ElementaryTypeName",
              "src": "365:7:52",
              "stateMutability": "nonpayable",
              "typeDescriptions": {
                "typeIdentifier": "t_address",
                "typeString": "address"
              }
            },
            "visibility": "internal"
          },
          {
            "id": 30591,
            "nodeType": "VariableDeclaration",
            "src": "396:50:52",
            "nodes": [],
            "constant": false,
            "functionSelector": "a217fddf",
            "mutability": "immutable",
            "name": "DEFAULT_ADMIN_ROLE",
            "nameLocation": "421:18:52",
            "scope": 30692,
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_bytes32",
              "typeString": "bytes32"
            },
            "typeName": {
              "id": 30589,
              "name": "bytes32",
              "nodeType": "ElementaryTypeName",
              "src": "396:7:52",
              "typeDescriptions": {
                "typeIdentifier": "t_bytes32",
                "typeString": "bytes32"
              }
            },
            "value": {
              "hexValue": "30783030",
              "id": 30590,
              "isConstant": false,
              "isLValue": false,
              "isPure": true,
              "kind": "number",
              "lValueRequested": false,
              "nodeType": "Literal",
              "src": "442:4:52",
              "typeDescriptions": {
                "typeIdentifier": "t_rational_0_by_1",
                "typeString": "int_const 0"
              },
              "value": "0x00"
            },
            "visibility": "public"
          },
          {
            "id": 30596,
            "nodeType": "VariableDeclaration",
            "src": "452:58:52",
            "nodes": [],
            "constant": false,
            "functionSelector": "d5391393",
            "mutability": "immutable",
            "name": "MINTER_ROLE",
            "nameLocation": "477:11:52",
            "scope": 30692,
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_bytes32",
              "typeString": "bytes32"
            },
            "typeName": {
              "id": 30592,
              "name": "bytes32",
              "nodeType": "ElementaryTypeName",
              "src": "452:7:52",
              "typeDescriptions": {
                "typeIdentifier": "t_bytes32",
                "typeString": "bytes32"
              }
            },
            "value": {
              "arguments": [
                {
                  "hexValue": "4d494e544552",
                  "id": 30594,
                  "isConstant": false,
                  "isLValue": false,
                  "isPure": true,
                  "kind": "string",
                  "lValueRequested": false,
                  "nodeType": "Literal",
                  "src": "501:8:52",
                  "typeDescriptions": {
                    "typeIdentifier": "t_stringliteral_f0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9",
                    "typeString": "literal_string \"MINTER\""
                  },
                  "value": "MINTER"
                }
              ],
              "expression": {
                "argumentTypes": [
                  {
                    "typeIdentifier": "t_stringliteral_f0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9",
                    "typeString": "literal_string \"MINTER\""
                  }
                ],
                "id": 30593,
                "name": "keccak256",
                "nodeType": "Identifier",
                "overloadedDeclarations": [],
                "referencedDeclaration": -8,
                "src": "491:9:52",
                "typeDescriptions": {
                  "typeIdentifier": "t_function_keccak256_pure$_t_bytes_memory_ptr_$returns$_t_bytes32_$",
                  "typeString": "function (bytes memory) pure returns (bytes32)"
                }
              },
              "id": 30595,
              "isConstant": false,
              "isLValue": false,
              "isPure": true,
              "kind": "functionCall",
              "lValueRequested": false,
              "nameLocations": [],
              "names": [],
              "nodeType": "FunctionCall",
              "src": "491:19:52",
              "tryCall": false,
              "typeDescriptions": {
                "typeIdentifier": "t_bytes32",
                "typeString": "bytes32"
              }
            },
            "visibility": "public"
          },
          {
            "id": 30606,
            "nodeType": "FunctionDefinition",
            "src": "521:93:52",
            "nodes": [],
            "body": {
              "id": 30605,
              "nodeType": "Block",
              "src": "560:54:52",
              "nodes": [],
              "statements": [
                {
                  "expression": {
                    "id": 30603,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftHandSide": {
                      "id": 30601,
                      "name": "metadataRenderer",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 30588,
                      "src": "570:16:52",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "nodeType": "Assignment",
                    "operator": "=",
                    "rightHandSide": {
                      "id": 30602,
                      "name": "_metadataRenderer",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 30598,
                      "src": "589:17:52",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "src": "570:36:52",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "id": 30604,
                  "nodeType": "ExpressionStatement",
                  "src": "570:36:52"
                }
              ]
            },
            "implemented": true,
            "kind": "constructor",
            "modifiers": [],
            "name": "",
            "nameLocation": "-1:-1:-1",
            "parameters": {
              "id": 30599,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 30598,
                  "mutability": "mutable",
                  "name": "_metadataRenderer",
                  "nameLocation": "541:17:52",
                  "nodeType": "VariableDeclaration",
                  "scope": 30606,
                  "src": "533:25:52",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 30597,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "533:7:52",
                    "stateMutability": "nonpayable",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "visibility": "internal"
                }
              ],
              "src": "532:27:52"
            },
            "returnParameters": {
              "id": 30600,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "560:0:52"
            },
            "scope": 30692,
            "stateMutability": "nonpayable",
            "virtual": false,
            "visibility": "public"
          },
          {
            "id": 30691,
            "nodeType": "FunctionDefinition",
            "src": "620:1712:52",
            "nodes": [],
            "body": {
              "id": 30690,
              "nodeType": "Block",
              "src": "716:1616:52",
              "nodes": [],
              "statements": [
                {
                  "assignments": [
                    30618
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 30618,
                      "mutability": "mutable",
                      "name": "metadataInitializer",
                      "nameLocation": "825:19:52",
                      "nodeType": "VariableDeclaration",
                      "scope": 30690,
                      "src": "812:32:52",
                      "stateVariable": false,
                      "storageLocation": "memory",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes_memory_ptr",
                        "typeString": "bytes"
                      },
                      "typeName": {
                        "id": 30617,
                        "name": "bytes",
                        "nodeType": "ElementaryTypeName",
                        "src": "812:5:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_storage_ptr",
                          "typeString": "bytes"
                        }
                      },
                      "visibility": "internal"
                    }
                  ],
                  "id": 30643,
                  "initialValue": {
                    "arguments": [
                      {
                        "arguments": [
                          {
                            "arguments": [
                              {
                                "hexValue": "646174613a6170706c69636174696f6e2f6a736f6e3b6261736536342c",
                                "id": 30625,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "string",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "912:31:52",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_stringliteral_bccab2d885f86fda81bfd84dd4248d31f8073b473d187111d36536db073076fa",
                                  "typeString": "literal_string \"data:application/json;base64,\""
                                },
                                "value": "data:application/json;base64,"
                              },
                              {
                                "arguments": [
                                  {
                                    "arguments": [
                                      {
                                        "arguments": [
                                          {
                                            "arguments": [
                                              {
                                                "hexValue": "7b226465736372697074696f6e223a20225061746368657320666f72205a656e2b222c20226e616d65223a20225a656e2b227d",
                                                "id": 30634,
                                                "isConstant": false,
                                                "isLValue": false,
                                                "isPure": true,
                                                "kind": "string",
                                                "lValueRequested": false,
                                                "nodeType": "Literal",
                                                "src": "1022:53:52",
                                                "typeDescriptions": {
                                                  "typeIdentifier": "t_stringliteral_35fbff9d99f57ba5637e191d686aecb3b3d194b67663b1390705b1c5efebfa60",
                                                  "typeString": "literal_string \"{\"description\": \"Patches for Zen+\", \"name\": \"Zen+\"}\""
                                                },
                                                "value": "{\"description\": \"Patches for Zen+\", \"name\": \"Zen+\"}"
                                              }
                                            ],
                                            "expression": {
                                              "argumentTypes": [
                                                {
                                                  "typeIdentifier": "t_stringliteral_35fbff9d99f57ba5637e191d686aecb3b3d194b67663b1390705b1c5efebfa60",
                                                  "typeString": "literal_string \"{\"description\": \"Patches for Zen+\", \"name\": \"Zen+\"}\""
                                                }
                                              ],
                                              "expression": {
                                                "id": 30632,
                                                "name": "abi",
                                                "nodeType": "Identifier",
                                                "overloadedDeclarations": [],
                                                "referencedDeclaration": -1,
                                                "src": "988:3:52",
                                                "typeDescriptions": {
                                                  "typeIdentifier": "t_magic_abi",
                                                  "typeString": "abi"
                                                }
                                              },
                                              "id": 30633,
                                              "isConstant": false,
                                              "isLValue": false,
                                              "isPure": true,
                                              "lValueRequested": false,
                                              "memberLocation": "992:12:52",
                                              "memberName": "encodePacked",
                                              "nodeType": "MemberAccess",
                                              "src": "988:16:52",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                                "typeString": "function () pure returns (bytes memory)"
                                              }
                                            },
                                            "id": 30635,
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": true,
                                            "kind": "functionCall",
                                            "lValueRequested": false,
                                            "nameLocations": [],
                                            "names": [],
                                            "nodeType": "FunctionCall",
                                            "src": "988:88:52",
                                            "tryCall": false,
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_bytes_memory_ptr",
                                              "typeString": "bytes memory"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_bytes_memory_ptr",
                                              "typeString": "bytes memory"
                                            }
                                          ],
                                          "id": 30631,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "nodeType": "ElementaryTypeNameExpression",
                                          "src": "981:6:52",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_type$_t_string_storage_ptr_$",
                                            "typeString": "type(string storage pointer)"
                                          },
                                          "typeName": {
                                            "id": 30630,
                                            "name": "string",
                                            "nodeType": "ElementaryTypeName",
                                            "src": "981:6:52",
                                            "typeDescriptions": {}
                                          }
                                        },
                                        "id": 30636,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": true,
                                        "kind": "typeConversion",
                                        "lValueRequested": false,
                                        "nameLocations": [],
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "981:96:52",
                                        "tryCall": false,
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_string_memory_ptr",
                                          "typeString": "string memory"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_string_memory_ptr",
                                          "typeString": "string memory"
                                        }
                                      ],
                                      "id": 30629,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": true,
                                      "lValueRequested": false,
                                      "nodeType": "ElementaryTypeNameExpression",
                                      "src": "975:5:52",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_type$_t_bytes_storage_ptr_$",
                                        "typeString": "type(bytes storage pointer)"
                                      },
                                      "typeName": {
                                        "id": 30628,
                                        "name": "bytes",
                                        "nodeType": "ElementaryTypeName",
                                        "src": "975:5:52",
                                        "typeDescriptions": {}
                                      }
                                    },
                                    "id": 30637,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "typeConversion",
                                    "lValueRequested": false,
                                    "nameLocations": [],
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "975:103:52",
                                    "tryCall": false,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes_memory_ptr",
                                      "typeString": "bytes memory"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_bytes_memory_ptr",
                                      "typeString": "bytes memory"
                                    }
                                  ],
                                  "expression": {
                                    "id": 30626,
                                    "name": "Base64",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 29780,
                                    "src": "961:6:52",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_contract$_Base64_$29780_$",
                                      "typeString": "type(library Base64)"
                                    }
                                  },
                                  "id": 30627,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberLocation": "968:6:52",
                                  "memberName": "encode",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 29779,
                                  "src": "961:13:52",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_internal_pure$_t_bytes_memory_ptr_$returns$_t_string_memory_ptr_$",
                                    "typeString": "function (bytes memory) pure returns (string memory)"
                                  }
                                },
                                "id": 30638,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "nameLocations": [],
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "961:118:52",
                                "tryCall": false,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_string_memory_ptr",
                                  "typeString": "string memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_stringliteral_bccab2d885f86fda81bfd84dd4248d31f8073b473d187111d36536db073076fa",
                                  "typeString": "literal_string \"data:application/json;base64,\""
                                },
                                {
                                  "typeIdentifier": "t_string_memory_ptr",
                                  "typeString": "string memory"
                                }
                              ],
                              "expression": {
                                "id": 30623,
                                "name": "abi",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": -1,
                                "src": "878:3:52",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_abi",
                                  "typeString": "abi"
                                }
                              },
                              "id": 30624,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "memberLocation": "882:12:52",
                              "memberName": "encodePacked",
                              "nodeType": "MemberAccess",
                              "src": "878:16:52",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                "typeString": "function () pure returns (bytes memory)"
                              }
                            },
                            "id": 30639,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "nameLocations": [],
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "878:202:52",
                            "tryCall": false,
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          ],
                          "id": 30622,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "nodeType": "ElementaryTypeNameExpression",
                          "src": "871:6:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_string_storage_ptr_$",
                            "typeString": "type(string storage pointer)"
                          },
                          "typeName": {
                            "id": 30621,
                            "name": "string",
                            "nodeType": "ElementaryTypeName",
                            "src": "871:6:52",
                            "typeDescriptions": {}
                          }
                        },
                        "id": 30640,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "typeConversion",
                        "lValueRequested": false,
                        "nameLocations": [],
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "871:210:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_string_memory_ptr",
                          "typeString": "string memory"
                        }
                      },
                      {
                        "id": 30641,
                        "name": "dsp",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 30608,
                        "src": "1095:3:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_string_memory_ptr",
                          "typeString": "string memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_string_memory_ptr",
                          "typeString": "string memory"
                        },
                        {
                          "typeIdentifier": "t_string_memory_ptr",
                          "typeString": "string memory"
                        }
                      ],
                      "expression": {
                        "id": 30619,
                        "name": "abi",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": -1,
                        "src": "847:3:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_magic_abi",
                          "typeString": "abi"
                        }
                      },
                      "id": 30620,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "memberLocation": "851:6:52",
                      "memberName": "encode",
                      "nodeType": "MemberAccess",
                      "src": "847:10:52",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_abiencode_pure$__$returns$_t_bytes_memory_ptr_$",
                        "typeString": "function () pure returns (bytes memory)"
                      }
                    },
                    "id": 30642,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "nameLocations": [],
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "847:261:52",
                    "tryCall": false,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes_memory_ptr",
                      "typeString": "bytes memory"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "812:296:52"
                },
                {
                  "assignments": [
                    30645
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 30645,
                      "mutability": "mutable",
                      "name": "ZORA_DROPS_CREATOR",
                      "nameLocation": "1325:18:52",
                      "nodeType": "VariableDeclaration",
                      "scope": 30690,
                      "src": "1317:26:52",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      },
                      "typeName": {
                        "id": 30644,
                        "name": "address",
                        "nodeType": "ElementaryTypeName",
                        "src": "1317:7:52",
                        "stateMutability": "nonpayable",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      },
                      "visibility": "internal"
                    }
                  ],
                  "id": 30650,
                  "initialValue": {
                    "arguments": [
                      {
                        "hexValue": "307865423239413465356238346665663432386330373264656241323434346539336330383043453837",
                        "id": 30648,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "number",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "1354:42:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "value": "0xeB29A4e5b84fef428c072debA2444e93c080CE87"
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 30647,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "ElementaryTypeNameExpression",
                      "src": "1346:7:52",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_address_$",
                        "typeString": "type(address)"
                      },
                      "typeName": {
                        "id": 30646,
                        "name": "address",
                        "nodeType": "ElementaryTypeName",
                        "src": "1346:7:52",
                        "typeDescriptions": {}
                      }
                    },
                    "id": 30649,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "nameLocations": [],
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1346:51:52",
                    "tryCall": false,
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1317:80:52"
                },
                {
                  "assignments": [
                    30652
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 30652,
                      "mutability": "mutable",
                      "name": "newDropAddress",
                      "nameLocation": "1416:14:52",
                      "nodeType": "VariableDeclaration",
                      "scope": 30690,
                      "src": "1408:22:52",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      },
                      "typeName": {
                        "id": 30651,
                        "name": "address",
                        "nodeType": "ElementaryTypeName",
                        "src": "1408:7:52",
                        "stateMutability": "nonpayable",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      },
                      "visibility": "internal"
                    }
                  ],
                  "id": 30687,
                  "initialValue": {
                    "arguments": [
                      {
                        "hexValue": "5a656e2b",
                        "id": 30657,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "string",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "1499:6:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_stringliteral_10c3b35ade8bfb50b139dfdf2bb8e62d75f98bf3a75937f56d1f663fdb5c8695",
                          "typeString": "literal_string \"Zen+\""
                        },
                        "value": "Zen+"
                      },
                      {
                        "hexValue": "5a454e2b",
                        "id": 30658,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "string",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "1518:6:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_stringliteral_88cb9cee460db84433bf499e2c2267cdd04fff9fda184fe8ea67e5401e5f7c93",
                          "typeString": "literal_string \"ZEN+\""
                        },
                        "value": "ZEN+"
                      },
                      {
                        "expression": {
                          "id": 30659,
                          "name": "msg",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": -15,
                          "src": "1536:3:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_magic_message",
                            "typeString": "msg"
                          }
                        },
                        "id": 30660,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberLocation": "1540:6:52",
                        "memberName": "sender",
                        "nodeType": "MemberAccess",
                        "src": "1536:10:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      },
                      {
                        "id": 30661,
                        "name": "editionSize",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 30612,
                        "src": "1589:11:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint64",
                          "typeString": "uint64"
                        }
                      },
                      {
                        "hexValue": "383030",
                        "id": 30662,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "number",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "1635:3:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_rational_800_by_1",
                          "typeString": "int_const 800"
                        },
                        "value": "800"
                      },
                      {
                        "arguments": [
                          {
                            "expression": {
                              "id": 30665,
                              "name": "msg",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": -15,
                              "src": "1671:3:52",
                              "typeDescriptions": {
                                "typeIdentifier": "t_magic_message",
                                "typeString": "msg"
                              }
                            },
                            "id": 30666,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberLocation": "1675:6:52",
                            "memberName": "sender",
                            "nodeType": "MemberAccess",
                            "src": "1671:10:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          ],
                          "id": 30664,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "nodeType": "ElementaryTypeNameExpression",
                          "src": "1663:8:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_address_payable_$",
                            "typeString": "type(address payable)"
                          },
                          "typeName": {
                            "id": 30663,
                            "name": "address",
                            "nodeType": "ElementaryTypeName",
                            "src": "1663:8:52",
                            "stateMutability": "payable",
                            "typeDescriptions": {}
                          }
                        },
                        "id": 30667,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "typeConversion",
                        "lValueRequested": false,
                        "nameLocations": [],
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1663:19:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_address_payable",
                          "typeString": "address payable"
                        }
                      },
                      {
                        "arguments": [
                          {
                            "id": 30670,
                            "name": "price",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 30610,
                            "src": "1775:5:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint104",
                              "typeString": "uint104"
                            }
                          },
                          {
                            "hexValue": "3130303030303030",
                            "id": 30671,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1821:8:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_10000000_by_1",
                              "typeString": "int_const 10000000"
                            },
                            "value": "10000000"
                          },
                          {
                            "hexValue": "30",
                            "id": 30672,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1860:1:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            "value": "0"
                          },
                          {
                            "hexValue": "353030303030303030303030303030",
                            "id": 30673,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1890:15:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_500000000000000_by_1",
                              "typeString": "int_const 500000000000000"
                            },
                            "value": "500000000000000"
                          },
                          {
                            "hexValue": "30",
                            "id": 30674,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1933:1:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            "value": "0"
                          },
                          {
                            "hexValue": "30",
                            "id": 30675,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1960:1:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            "value": "0"
                          },
                          {
                            "hexValue": "307830",
                            "id": 30676,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1994:3:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            "value": "0x0"
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint104",
                              "typeString": "uint104"
                            },
                            {
                              "typeIdentifier": "t_rational_10000000_by_1",
                              "typeString": "int_const 10000000"
                            },
                            {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            {
                              "typeIdentifier": "t_rational_500000000000000_by_1",
                              "typeString": "int_const 500000000000000"
                            },
                            {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            }
                          ],
                          "expression": {
                            "id": 30668,
                            "name": "IERC721Drop",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 29203,
                            "src": "1713:11:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_IERC721Drop_$29203_$",
                              "typeString": "type(contract IERC721Drop)"
                            }
                          },
                          "id": 30669,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberLocation": "1725:18:52",
                          "memberName": "SalesConfiguration",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 29086,
                          "src": "1713:30:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_struct$_SalesConfiguration_$29086_storage_ptr_$",
                            "typeString": "type(struct IERC721Drop.SalesConfiguration storage pointer)"
                          }
                        },
                        "id": 30677,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "structConstructorCall",
                        "lValueRequested": false,
                        "nameLocations": [
                          "1758:15:52",
                          "1794:25:52",
                          "1843:15:52",
                          "1875:13:52",
                          "1919:12:52",
                          "1948:10:52",
                          "1975:17:52"
                        ],
                        "names": [
                          "publicSalePrice",
                          "maxSalePurchasePerAddress",
                          "publicSaleStart",
                          "publicSaleEnd",
                          "presaleStart",
                          "presaleEnd",
                          "presaleMerkleRoot"
                        ],
                        "nodeType": "FunctionCall",
                        "src": "1713:291:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_struct$_SalesConfiguration_$29086_memory_ptr",
                          "typeString": "struct IERC721Drop.SalesConfiguration memory"
                        }
                      },
                      {
                        "arguments": [
                          {
                            "id": 30679,
                            "name": "metadataRenderer",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 30588,
                            "src": "2034:16:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          ],
                          "id": 30678,
                          "name": "IMetadataRenderer",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 29250,
                          "src": "2016:17:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_contract$_IMetadataRenderer_$29250_$",
                            "typeString": "type(contract IMetadataRenderer)"
                          }
                        },
                        "id": 30680,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "typeConversion",
                        "lValueRequested": false,
                        "nameLocations": [],
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2016:35:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_IMetadataRenderer_$29250",
                          "typeString": "contract IMetadataRenderer"
                        }
                      },
                      {
                        "id": 30681,
                        "name": "metadataInitializer",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 30618,
                        "src": "2064:19:52",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      },
                      {
                        "arguments": [
                          {
                            "hexValue": "30",
                            "id": 30684,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "number",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "2137:1:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            },
                            "value": "0"
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_rational_0_by_1",
                              "typeString": "int_const 0"
                            }
                          ],
                          "id": 30683,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "nodeType": "ElementaryTypeNameExpression",
                          "src": "2129:7:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_address_$",
                            "typeString": "type(address)"
                          },
                          "typeName": {
                            "id": 30682,
                            "name": "address",
                            "nodeType": "ElementaryTypeName",
                            "src": "2129:7:52",
                            "typeDescriptions": {}
                          }
                        },
                        "id": 30685,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "typeConversion",
                        "lValueRequested": false,
                        "nameLocations": [],
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2129:10:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_stringliteral_10c3b35ade8bfb50b139dfdf2bb8e62d75f98bf3a75937f56d1f663fdb5c8695",
                          "typeString": "literal_string \"Zen+\""
                        },
                        {
                          "typeIdentifier": "t_stringliteral_88cb9cee460db84433bf499e2c2267cdd04fff9fda184fe8ea67e5401e5f7c93",
                          "typeString": "literal_string \"ZEN+\""
                        },
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        {
                          "typeIdentifier": "t_uint64",
                          "typeString": "uint64"
                        },
                        {
                          "typeIdentifier": "t_rational_800_by_1",
                          "typeString": "int_const 800"
                        },
                        {
                          "typeIdentifier": "t_address_payable",
                          "typeString": "address payable"
                        },
                        {
                          "typeIdentifier": "t_struct$_SalesConfiguration_$29086_memory_ptr",
                          "typeString": "struct IERC721Drop.SalesConfiguration memory"
                        },
                        {
                          "typeIdentifier": "t_contract$_IMetadataRenderer_$29250",
                          "typeString": "contract IMetadataRenderer"
                        },
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        },
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "expression": {
                        "arguments": [
                          {
                            "id": 30654,
                            "name": "ZORA_DROPS_CREATOR",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 30645,
                            "src": "1449:18:52",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          ],
                          "id": 30653,
                          "name": "IZoraNFTCreator",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 30392,
                          "src": "1433:15:52",
                          "typeDescriptions": {
                            "typeIdentifier": "t_type$_t_contract$_IZoraNFTCreator_$30392_$",
                            "typeString": "type(contract IZoraNFTCreator)"
                          }
                        },
                        "id": 30655,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "typeConversion",
                        "lValueRequested": false,
                        "nameLocations": [],
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1433:35:52",
                        "tryCall": false,
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_IZoraNFTCreator_$30392",
                          "typeString": "contract IZoraNFTCreator"
                        }
                      },
                      "id": 30656,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberLocation": "1469:18:52",
                      "memberName": "setupDropsContract",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 30391,
                      "src": "1433:54:52",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_string_memory_ptr_$_t_string_memory_ptr_$_t_address_$_t_uint64_$_t_uint16_$_t_address_payable_$_t_struct$_SalesConfiguration_$29086_memory_ptr_$_t_contract$_IMetadataRenderer_$29250_$_t_bytes_memory_ptr_$_t_address_$returns$_t_address_$",
                        "typeString": "function (string memory,string memory,address,uint64,uint16,address payable,struct IERC721Drop.SalesConfiguration memory,contract IMetadataRenderer,bytes memory,address) external returns (address)"
                      }
                    },
                    "id": 30686,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "nameLocations": [],
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1433:715:52",
                    "tryCall": false,
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1408:740:52"
                },
                {
                  "expression": {
                    "id": 30688,
                    "name": "newDropAddress",
                    "nodeType": "Identifier",
                    "overloadedDeclarations": [],
                    "referencedDeclaration": 30652,
                    "src": "2311:14:52",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "functionReturnParameters": 30616,
                  "id": 30689,
                  "nodeType": "Return",
                  "src": "2304:21:52"
                }
              ]
            },
            "functionSelector": "eb3e312e",
            "implemented": true,
            "kind": "function",
            "modifiers": [],
            "name": "newDrop",
            "nameLocation": "629:7:52",
            "parameters": {
              "id": 30613,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 30608,
                  "mutability": "mutable",
                  "name": "dsp",
                  "nameLocation": "651:3:52",
                  "nodeType": "VariableDeclaration",
                  "scope": 30691,
                  "src": "637:17:52",
                  "stateVariable": false,
                  "storageLocation": "memory",
                  "typeDescriptions": {
                    "typeIdentifier": "t_string_memory_ptr",
                    "typeString": "string"
                  },
                  "typeName": {
                    "id": 30607,
                    "name": "string",
                    "nodeType": "ElementaryTypeName",
                    "src": "637:6:52",
                    "typeDescriptions": {
                      "typeIdentifier": "t_string_storage_ptr",
                      "typeString": "string"
                    }
                  },
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 30610,
                  "mutability": "mutable",
                  "name": "price",
                  "nameLocation": "664:5:52",
                  "nodeType": "VariableDeclaration",
                  "scope": 30691,
                  "src": "656:13:52",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint104",
                    "typeString": "uint104"
                  },
                  "typeName": {
                    "id": 30609,
                    "name": "uint104",
                    "nodeType": "ElementaryTypeName",
                    "src": "656:7:52",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint104",
                      "typeString": "uint104"
                    }
                  },
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 30612,
                  "mutability": "mutable",
                  "name": "editionSize",
                  "nameLocation": "678:11:52",
                  "nodeType": "VariableDeclaration",
                  "scope": 30691,
                  "src": "671:18:52",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint64",
                    "typeString": "uint64"
                  },
                  "typeName": {
                    "id": 30611,
                    "name": "uint64",
                    "nodeType": "ElementaryTypeName",
                    "src": "671:6:52",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint64",
                      "typeString": "uint64"
                    }
                  },
                  "visibility": "internal"
                }
              ],
              "src": "636:54:52"
            },
            "returnParameters": {
              "id": 30616,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 30615,
                  "mutability": "mutable",
                  "name": "",
                  "nameLocation": "-1:-1:-1",
                  "nodeType": "VariableDeclaration",
                  "scope": 30691,
                  "src": "707:7:52",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 30614,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "707:7:52",
                    "stateMutability": "nonpayable",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "visibility": "internal"
                }
              ],
              "src": "706:9:52"
            },
            "scope": 30692,
            "stateMutability": "nonpayable",
            "virtual": false,
            "visibility": "public"
          }
        ],
        "abstract": false,
        "baseContracts": [],
        "canonicalName": "SoundDropCreator",
        "contractDependencies": [],
        "contractKind": "contract",
        "fullyImplemented": true,
        "linearizedBaseContracts": [
          30692
        ],
        "name": "SoundDropCreator",
        "nameLocation": "341:16:52",
        "scope": 30693,
        "usedErrors": [],
        "usedEvents": []
      }
    ],
    "license": "MIT"
  },
  "id": 52
};
