#!/usr/bin/env bash
# Kredilo - design polish wave: round pill dock, emerald-circle logo, clean referral copy,
# emerald glow across the site + admin, and proper per-game pages. Run from the repo root:
#   cd ~/kredilo && bash apply-kredilo-polish.sh
set -euo pipefail
if [ ! -f package.json ] || [ ! -d src ] || [ ! -d server ]; then
  echo "Run this from the kredilo repo root (where package.json, src/ and server/ live)." >&2
  exit 1
fi
echo "Writing files..."
mkdir -p "src/components"
cat > "src/components/Logo.tsx" <<'KREDILO_POLISH_EOF'
// Kredilo logo — traced directly from the supplied brand artwork (logo image), not redrawn.
// Uses currentColor, so set colour with text-white / text-black.
const FULL_VIEWBOX = "0 0 1325 257";
const FULL_PATH =
  "M245.5 251.7Q239.0 253.2 234.5 253.3Q230.0 253.5 227.0 253.0Q224.0 252.4 220.0 251.3Q216.0 250.2 211.5 248.2Q207.0 246.2 203.5 243.8Q200.0 241.4 195.8 237.2Q191.6 233.0 186.8 225.4Q182.0 217.7 178.5 213.6Q175.0 209.6 171.0 206.7Q167.0 203.8 164.2 202.4Q161.4 201.0 155.2 199.3Q149.0 197.6 144.5 197.6Q140.0 197.5 137.0 198.0Q134.0 198.6 130.5 199.7Q127.0 200.8 124.0 202.3Q121.0 203.8 116.3 207.4Q111.6 211.0 108.2 215.5Q104.8 220.0 101.5 226.0Q98.2 232.0 95.7 235.0Q93.2 238.0 90.1 240.6Q87.0 243.2 83.0 245.7Q79.0 248.1 72.5 250.3Q66.0 252.4 62.0 252.9Q58.0 253.5 55.0 253.4Q52.0 253.4 43.8 251.2Q35.6 249.0 29.8 245.7Q24.0 242.4 19.3 237.7Q14.6 233.0 12.6 230.0Q10.7 227.0 8.3 221.5Q5.8 216.0 4.7 209.5Q3.6 203.0 4.1 198.0Q4.6 193.0 5.7 188.5Q6.8 184.0 9.3 179.0Q11.8 174.0 14.7 170.0Q17.6 166.0 19.6 164.0Q21.7 162.0 26.4 158.9Q31.0 155.7 34.0 154.3Q37.0 152.8 42.5 151.2Q48.0 149.6 52.0 149.1Q56.0 148.7 61.0 149.2Q66.0 149.8 71.0 151.3Q76.0 152.8 80.0 154.8Q84.0 156.8 87.5 159.2Q91.0 161.6 95.0 165.5Q99.0 169.4 101.0 170.8Q103.0 172.2 108.0 173.8Q113.0 175.5 117.0 175.4Q121.0 175.4 124.0 174.3Q127.0 173.3 130.2 171.1Q133.4 169.0 135.3 166.0Q137.3 163.0 137.8 161.5Q138.4 160.0 138.4 156.0Q138.5 152.0 137.4 148.5Q136.3 145.0 115.5 113.0Q94.8 81.0 92.3 76.0Q89.8 71.0 88.7 67.0Q87.6 63.0 87.1 57.5Q86.6 52.0 87.2 48.0Q87.8 44.0 89.3 39.5Q90.7 35.0 94.6 28.5Q98.6 22.0 101.8 18.8Q105.0 15.6 109.5 12.6Q114.0 9.7 121.5 7.2Q129.0 4.6 133.5 4.1Q138.0 3.6 142.0 4.1Q146.0 4.6 151.5 6.2Q157.0 7.8 159.0 8.8Q161.0 9.8 165.6 12.9Q170.3 16.0 172.9 18.5Q175.5 21.0 226.9 98.0Q278.3 175.0 280.2 179.0Q282.2 183.0 283.8 189.0Q285.5 195.0 285.4 202.0Q285.4 209.0 284.8 212.0Q284.2 215.0 282.2 220.0Q280.3 225.0 277.4 229.5Q274.4 234.0 269.7 238.6Q265.0 243.2 258.5 246.7Q252.0 250.2 245.5 251.7ZM1030.0 67.2Q1026.0 68.2 1024.0 68.3Q1022.0 68.4 1019.0 67.8Q1016.0 67.2 1013.0 66.2Q1010.0 65.1 1008.4 64.1Q1006.7 63.0 1002.8 59.0Q998.8 55.0 997.3 52.0Q995.8 49.0 995.2 46.5Q994.6 44.0 994.7 39.0Q994.8 34.0 996.0 30.5Q997.3 27.0 998.9 24.5Q1000.6 22.0 1003.8 18.9Q1007.0 15.8 1010.0 14.3Q1013.0 12.8 1017.0 11.7Q1021.0 10.6 1024.5 10.7Q1028.0 10.8 1031.5 11.8Q1035.0 12.8 1037.1 13.9Q1039.3 15.0 1043.2 18.5Q1047.2 22.0 1049.8 28.0Q1052.4 34.0 1052.3 39.5Q1052.2 45.0 1051.1 48.2Q1050.0 51.4 1048.5 53.8Q1047.0 56.3 1043.5 59.7Q1040.0 63.2 1037.0 64.7Q1034.0 66.2 1030.0 67.2ZM1109.5 236.7Q1105.0 238.2 1101.0 238.3Q1097.0 238.5 1094.0 237.8Q1091.0 237.2 1088.5 236.2Q1086.0 235.2 1082.9 233.1Q1079.7 231.0 1078.4 229.6Q1077.0 228.3 1074.6 224.6Q1072.3 221.0 1070.9 216.0Q1069.5 211.0 1069.6 125.0Q1069.6 39.0 1070.2 36.5Q1070.8 34.0 1072.3 31.0Q1073.8 28.0 1076.4 24.8Q1079.0 21.6 1085.0 18.2Q1091.0 14.8 1094.5 14.2Q1098.0 13.5 1100.5 13.6Q1103.0 13.6 1107.0 14.7Q1111.0 15.8 1115.2 18.4Q1119.5 21.0 1121.7 23.4Q1124.0 25.7 1125.6 28.4Q1127.3 31.0 1128.2 33.5Q1129.2 36.0 1129.8 40.0Q1130.5 44.0 1130.4 127.0Q1130.4 210.0 1128.8 216.0Q1127.1 222.0 1124.3 226.0Q1121.4 230.0 1117.7 232.6Q1114.0 235.3 1109.5 236.7ZM263.0 81.7Q261.0 82.2 254.0 82.2Q247.0 82.2 243.5 81.0Q240.0 79.7 236.5 77.5Q233.0 75.2 231.3 73.6Q229.6 72.0 227.2 68.5Q224.9 65.0 223.2 60.0Q221.6 55.0 221.7 48.0Q221.8 41.0 222.9 37.8Q224.0 34.6 225.9 31.3Q227.8 28.0 230.9 24.8Q234.0 21.6 236.0 20.2Q238.0 18.8 244.0 16.7Q250.0 14.6 254.0 14.6Q258.0 14.6 260.5 15.2Q263.0 15.8 268.0 18.2Q273.0 20.6 276.7 24.3Q280.4 28.0 281.8 30.0Q283.2 32.0 284.2 34.0Q285.2 36.0 286.3 40.0Q287.4 44.0 287.3 49.5Q287.2 55.0 285.7 59.5Q284.1 64.0 282.7 66.5Q281.2 69.0 278.1 72.2Q275.0 75.4 273.0 76.8Q271.0 78.2 268.0 79.7Q265.0 81.2 263.0 81.7ZM911.5 237.7Q904.0 239.2 893.0 239.3Q882.0 239.4 878.0 238.8Q874.0 238.2 865.0 235.7Q856.0 233.2 847.4 228.6Q838.7 224.0 835.6 221.5Q832.5 219.0 827.3 213.7Q822.0 208.5 818.9 204.2Q815.8 200.0 812.9 194.2Q810.0 188.4 807.3 179.2Q804.6 170.0 804.1 165.5Q803.5 161.0 803.5 155.0Q803.5 149.0 804.5 142.5Q805.6 136.0 807.2 130.5Q808.8 125.0 811.3 119.5Q813.7 114.0 815.9 110.4Q818.0 106.7 821.3 102.4Q824.6 98.0 828.0 94.5Q831.5 91.0 837.8 86.4Q844.0 81.8 850.0 78.8Q856.0 75.8 860.5 74.3Q865.0 72.8 874.0 71.2Q883.0 69.6 890.0 69.6Q897.0 69.6 903.0 70.7Q909.0 71.8 913.5 73.1Q918.0 74.5 918.5 74.3Q919.0 74.1 919.3 57.0Q919.6 40.0 920.2 37.5Q920.8 35.0 922.8 31.0Q924.8 27.0 927.4 24.3Q930.0 21.6 933.8 19.3Q937.6 17.0 941.8 15.8Q946.0 14.6 949.0 14.6Q952.0 14.6 957.0 16.2Q962.0 17.7 964.6 19.4Q967.3 21.0 969.1 22.8Q971.0 24.5 973.6 28.8Q976.2 33.0 977.3 37.5Q978.4 42.0 978.5 103.0Q978.5 164.0 978.0 168.5Q977.4 173.0 975.3 180.5Q973.2 188.0 970.2 194.0Q967.2 200.0 963.3 205.5Q959.4 211.0 955.2 215.2Q951.0 219.4 946.5 222.8Q942.0 226.2 936.5 229.2Q931.0 232.2 925.0 234.2Q919.0 236.2 911.5 237.7ZM480.5 236.7Q478.0 237.2 475.5 237.3Q473.0 237.4 470.0 236.8Q467.0 236.2 463.5 234.7Q460.0 233.3 457.0 231.4Q454.0 229.4 434.7 207.2Q415.4 185.0 413.7 183.3Q412.0 181.6 411.0 181.2Q410.0 180.8 409.3 181.9Q408.5 183.0 408.5 195.5Q408.5 208.0 407.8 211.5Q407.2 215.0 406.2 217.5Q405.3 220.0 403.7 222.5Q402.2 225.0 399.2 228.0Q396.3 231.0 393.6 232.6Q391.0 234.3 388.0 235.3Q385.0 236.4 381.5 236.9Q378.0 237.5 374.5 236.9Q371.0 236.4 368.0 235.3Q365.0 234.3 361.5 232.2Q358.0 230.2 356.3 228.6Q354.6 227.0 353.2 225.0Q351.8 223.0 349.8 218.5Q347.8 214.0 347.5 209.5Q347.2 205.0 347.3 126.5Q347.5 48.0 348.2 45.5Q348.8 43.0 351.3 38.5Q353.8 34.0 355.4 32.3Q357.0 30.6 359.0 29.2Q361.0 27.8 366.0 25.7Q371.0 23.6 374.5 23.4Q378.0 23.2 381.5 23.5Q385.0 23.8 388.2 24.9Q391.4 26.0 393.8 27.5Q396.3 29.0 398.9 31.5Q401.4 34.0 402.8 36.0Q404.2 38.0 405.7 41.5Q407.2 45.0 407.8 48.0Q408.5 51.0 408.7 84.0Q409.0 117.1 410.0 117.1Q411.0 117.1 414.6 114.6Q418.3 112.0 441.0 94.5Q463.7 77.0 466.4 75.4Q469.0 73.9 472.5 72.7Q476.0 71.6 482.0 71.7Q488.0 71.8 492.5 73.8Q497.0 75.8 500.1 78.9Q503.2 82.0 505.2 86.5Q507.2 91.0 507.3 93.0Q507.5 95.0 506.8 99.5Q506.2 104.0 504.7 107.0Q503.2 110.0 499.6 113.7Q496.0 117.4 477.9 130.7Q459.7 144.0 459.1 145.0Q458.4 146.0 459.5 148.0Q460.6 150.0 479.0 169.5Q497.4 189.0 500.1 193.5Q502.7 198.0 503.6 201.0Q504.4 204.0 504.3 209.0Q504.2 214.0 503.2 217.0Q502.1 220.0 500.3 223.0Q498.4 226.0 494.2 229.6Q490.0 233.2 486.5 234.7Q483.0 236.2 480.5 236.7ZM552.0 236.2Q549.0 237.2 544.0 237.3Q539.0 237.4 536.5 236.8Q534.0 236.2 531.0 234.7Q528.0 233.2 526.0 231.8Q524.0 230.4 522.0 228.4Q520.0 226.3 517.4 220.6Q514.8 215.0 514.7 178.5Q514.5 142.0 515.1 138.0Q515.6 134.0 517.2 127.5Q518.8 121.0 521.3 115.0Q523.8 109.0 528.2 102.5Q532.6 96.0 536.8 91.8Q541.0 87.6 545.5 84.6Q550.0 81.7 555.0 79.3Q560.0 76.8 564.5 75.3Q569.0 73.8 575.0 72.7Q581.0 71.6 584.5 71.5Q588.0 71.4 590.0 71.0Q592.0 70.5 598.0 70.5Q604.0 70.5 608.5 71.7Q613.0 72.8 615.6 74.4Q618.3 76.0 620.6 78.3Q623.0 80.5 625.1 84.3Q627.2 88.0 627.8 90.5Q628.4 93.0 628.4 95.0Q628.5 97.0 627.3 101.5Q626.2 106.0 624.3 109.0Q622.4 112.0 619.2 114.6Q616.0 117.2 611.5 118.8Q607.0 120.4 602.5 120.5Q598.0 120.6 594.0 121.7Q590.0 122.8 587.0 124.7Q584.0 126.6 581.4 129.3Q578.8 132.0 577.3 134.5Q575.9 137.0 574.2 142.5Q572.6 148.0 572.5 179.5Q572.5 211.0 571.8 214.0Q571.2 217.0 570.2 219.5Q569.2 222.0 566.1 226.2Q563.0 230.4 559.0 232.8Q555.0 235.3 552.0 236.2ZM718.0 238.8Q712.0 239.2 702.5 238.3Q693.0 237.4 685.0 235.3Q677.0 233.2 669.5 229.7Q662.0 226.2 657.4 223.1Q652.7 220.0 648.6 216.5Q644.6 213.0 641.3 209.1Q638.0 205.3 634.9 200.6Q631.8 196.0 628.8 189.5Q625.8 183.0 623.7 174.5Q621.6 166.0 621.6 156.0Q621.5 146.0 623.2 138.5Q624.8 131.0 628.3 123.0Q631.8 115.0 635.7 109.5Q639.6 104.0 646.1 97.5Q652.7 91.0 656.4 88.4Q660.0 85.8 666.5 82.3Q673.0 78.7 681.5 75.8Q690.0 72.8 696.5 71.7Q703.0 70.5 712.5 70.5Q722.0 70.5 730.0 72.2Q738.0 73.8 745.0 76.3Q752.0 78.7 757.0 81.3Q762.0 83.8 765.1 85.9Q768.3 88.0 770.6 89.8Q773.0 91.6 777.2 95.8Q781.5 100.0 784.8 104.5Q788.2 109.0 791.2 115.5Q794.2 122.0 795.8 128.5Q797.4 135.0 797.4 141.5Q797.5 148.0 796.8 151.0Q796.2 154.0 793.8 158.0Q791.4 162.0 788.7 164.1Q786.0 166.2 783.0 167.3Q780.0 168.4 730.5 168.7Q680.9 169.0 680.4 170.0Q679.9 171.0 680.6 173.0Q681.3 175.0 682.9 177.5Q684.6 180.0 686.5 182.0Q688.5 184.0 692.8 186.6Q697.0 189.3 701.5 190.8Q706.0 192.4 710.0 192.9Q714.0 193.3 720.0 192.3Q726.0 191.2 731.0 189.2Q736.0 187.2 741.0 183.5Q746.0 179.8 748.0 178.8Q750.0 177.7 754.0 176.6Q758.0 175.5 760.5 175.6Q763.0 175.6 766.5 176.7Q770.0 177.7 773.0 179.7Q776.0 181.6 778.1 184.3Q780.1 187.0 781.3 190.5Q782.5 194.0 782.4 198.0Q782.4 202.0 781.8 204.0Q781.2 206.0 779.3 209.0Q777.4 212.0 773.4 215.5Q769.3 219.0 763.1 223.1Q757.0 227.2 752.0 229.7Q747.0 232.2 741.0 234.2Q735.0 236.2 729.5 237.3Q724.0 238.4 718.0 238.8ZM1248.5 237.7Q1240.0 239.2 1233.0 239.3Q1226.0 239.4 1216.0 237.8Q1206.0 236.2 1200.0 234.2Q1194.0 232.2 1189.0 229.7Q1184.0 227.3 1177.0 222.4Q1170.0 217.4 1166.3 213.7Q1162.6 210.0 1160.2 207.0Q1157.8 204.0 1155.8 201.0Q1153.8 198.0 1150.8 192.0Q1147.7 186.0 1145.7 179.5Q1143.6 173.0 1142.6 166.0Q1141.6 159.0 1142.1 151.0Q1142.6 143.0 1143.7 138.0Q1144.8 133.0 1146.3 128.5Q1147.8 124.0 1150.8 118.0Q1153.8 112.0 1157.7 106.5Q1161.6 101.0 1166.8 95.8Q1172.0 90.6 1179.5 85.6Q1187.0 80.7 1195.5 77.3Q1204.0 73.8 1212.0 72.2Q1220.0 70.6 1232.0 70.6Q1244.0 70.6 1251.5 72.2Q1259.0 73.8 1264.5 75.8Q1270.0 77.7 1276.0 80.8Q1282.0 83.8 1285.1 85.9Q1288.3 88.0 1293.9 93.0Q1299.4 98.0 1304.3 104.5Q1309.2 111.0 1312.7 118.0Q1316.2 125.0 1318.2 132.0Q1320.2 139.0 1320.8 143.0Q1321.4 147.0 1321.4 155.0Q1321.4 163.0 1319.8 171.0Q1318.2 179.0 1314.7 187.0Q1311.2 195.0 1306.3 202.0Q1301.4 209.0 1297.2 213.2Q1293.0 217.4 1290.6 219.2Q1288.3 221.0 1280.6 225.6Q1273.0 230.3 1265.0 233.2Q1257.0 236.2 1248.5 237.7ZM1034.0 236.2Q1029.0 238.2 1025.0 238.3Q1021.0 238.5 1018.0 237.8Q1015.0 237.2 1011.5 235.7Q1008.0 234.2 1005.5 232.3Q1003.0 230.4 1000.9 227.7Q998.8 225.0 997.5 222.5Q996.3 220.0 994.9 215.0Q993.5 210.0 993.6 156.0Q993.6 102.0 994.7 97.5Q995.8 93.0 998.4 88.8Q1001.0 84.5 1002.9 82.8Q1004.7 81.0 1007.1 79.5Q1009.5 78.0 1011.8 76.9Q1014.0 75.8 1017.0 75.2Q1020.0 74.5 1025.0 74.7Q1030.0 74.8 1036.0 77.7Q1042.0 80.6 1044.7 83.3Q1047.4 86.0 1048.4 87.5Q1049.3 89.0 1050.7 92.5Q1052.2 96.0 1052.8 99.5Q1053.5 103.0 1053.4 157.0Q1053.4 211.0 1052.8 214.0Q1052.2 217.0 1049.3 222.5Q1046.4 228.0 1042.7 231.1Q1039.0 234.2 1034.0 236.2ZM713.8 132.2Q743.6 132.0 743.9 131.0Q744.1 130.0 742.7 127.0Q741.2 124.0 737.6 120.3Q734.0 116.6 731.0 114.7Q728.0 112.9 722.0 111.2Q716.0 109.5 711.5 109.7Q707.0 109.8 703.5 110.8Q700.0 111.8 697.0 113.3Q694.0 114.8 692.0 116.2Q690.0 117.6 687.3 120.3Q684.6 123.0 682.7 127.0Q680.8 131.0 681.4 131.7Q682.0 132.3 683.0 132.4Q684.0 132.5 713.8 132.2ZM894.7 190.2Q896.5 190.0 899.2 189.6Q902.0 189.2 905.5 188.0Q909.0 186.7 914.7 182.4Q920.4 178.0 922.8 174.5Q925.1 171.0 926.7 167.0Q928.2 163.0 928.3 156.0Q928.5 149.0 927.8 146.5Q927.2 144.0 925.2 140.0Q923.2 136.0 920.6 132.8Q918.0 129.6 914.0 126.7Q910.0 123.8 908.0 122.8Q906.0 121.8 901.5 120.7Q897.0 119.6 894.5 119.6Q892.0 119.5 888.5 120.2Q885.0 120.8 881.0 122.3Q877.0 123.8 875.0 125.2Q873.0 126.6 869.3 130.3Q865.6 134.0 863.9 136.5Q862.3 139.0 861.1 142.0Q859.8 145.0 859.2 147.5Q858.6 150.0 858.6 154.5Q858.5 159.0 859.2 162.0Q859.8 165.0 861.3 168.5Q862.8 172.0 864.2 174.0Q865.6 176.0 869.3 179.7Q873.0 183.4 879.0 186.3Q885.0 189.2 889.0 189.8Q893.0 190.5 894.7 190.2ZM1233.2 190.2Q1235.5 190.0 1241.2 188.4Q1247.0 186.7 1250.6 184.4Q1254.3 182.0 1255.9 180.5Q1257.4 179.0 1259.3 176.5Q1261.2 174.0 1263.2 170.0Q1265.2 166.0 1266.3 160.5Q1267.3 155.0 1266.8 151.0Q1266.2 147.0 1265.1 143.8Q1264.0 140.6 1263.0 138.7Q1262.0 136.7 1258.7 132.9Q1255.5 129.0 1252.7 126.9Q1250.0 124.8 1247.0 123.3Q1244.0 121.8 1239.5 120.7Q1235.0 119.6 1232.0 119.6Q1229.0 119.6 1224.5 120.7Q1220.0 121.8 1216.0 123.8Q1212.0 125.8 1207.8 129.9Q1203.6 134.0 1201.6 137.0Q1199.7 140.0 1198.3 144.0Q1196.8 148.0 1196.7 154.5Q1196.6 161.0 1197.7 164.5Q1198.8 168.0 1200.3 171.0Q1201.8 174.0 1204.2 177.0Q1206.6 180.0 1209.1 182.0Q1211.7 184.0 1214.2 185.5Q1216.6 187.0 1219.8 188.1Q1223.0 189.2 1227.0 189.8Q1231.0 190.5 1233.2 190.2Z";
export const MARK_VIEWBOX = "0 0 292 258";
export const MARK_PATH =
  "M245.5 251.7Q239.0 253.2 234.5 253.3Q230.0 253.5 227.0 253.0Q224.0 252.4 220.0 251.3Q216.0 250.2 211.5 248.2Q207.0 246.2 203.5 243.8Q200.0 241.4 195.8 237.2Q191.6 233.0 186.8 225.4Q182.0 217.7 178.5 213.6Q175.0 209.6 171.0 206.7Q167.0 203.8 164.2 202.4Q161.4 201.0 155.2 199.3Q149.0 197.6 144.5 197.6Q140.0 197.5 137.0 198.0Q134.0 198.6 130.5 199.7Q127.0 200.8 124.0 202.3Q121.0 203.8 116.3 207.4Q111.6 211.0 108.2 215.5Q104.8 220.0 101.5 226.0Q98.2 232.0 95.7 235.0Q93.2 238.0 90.1 240.6Q87.0 243.2 83.0 245.7Q79.0 248.1 72.5 250.3Q66.0 252.4 62.0 252.9Q58.0 253.5 55.0 253.4Q52.0 253.4 43.8 251.2Q35.6 249.0 29.8 245.7Q24.0 242.4 19.3 237.7Q14.6 233.0 12.6 230.0Q10.7 227.0 8.3 221.5Q5.8 216.0 4.7 209.5Q3.6 203.0 4.1 198.0Q4.6 193.0 5.7 188.5Q6.8 184.0 9.3 179.0Q11.8 174.0 14.7 170.0Q17.6 166.0 19.6 164.0Q21.7 162.0 26.4 158.9Q31.0 155.7 34.0 154.3Q37.0 152.8 42.5 151.2Q48.0 149.6 52.0 149.1Q56.0 148.7 61.0 149.2Q66.0 149.8 71.0 151.3Q76.0 152.8 80.0 154.8Q84.0 156.8 87.5 159.2Q91.0 161.6 95.0 165.5Q99.0 169.4 101.0 170.8Q103.0 172.2 108.0 173.8Q113.0 175.5 117.0 175.4Q121.0 175.4 124.0 174.3Q127.0 173.3 130.2 171.1Q133.4 169.0 135.3 166.0Q137.3 163.0 137.8 161.5Q138.4 160.0 138.4 156.0Q138.5 152.0 137.4 148.5Q136.3 145.0 115.5 113.0Q94.8 81.0 92.3 76.0Q89.8 71.0 88.7 67.0Q87.6 63.0 87.1 57.5Q86.6 52.0 87.2 48.0Q87.8 44.0 89.3 39.5Q90.7 35.0 94.6 28.5Q98.6 22.0 101.8 18.8Q105.0 15.6 109.5 12.6Q114.0 9.7 121.5 7.2Q129.0 4.6 133.5 4.1Q138.0 3.6 142.0 4.1Q146.0 4.6 151.5 6.2Q157.0 7.8 159.0 8.8Q161.0 9.8 165.6 12.9Q170.3 16.0 172.9 18.5Q175.5 21.0 226.9 98.0Q278.3 175.0 280.2 179.0Q282.2 183.0 283.8 189.0Q285.5 195.0 285.4 202.0Q285.4 209.0 284.8 212.0Q284.2 215.0 282.2 220.0Q280.3 225.0 277.4 229.5Q274.4 234.0 269.7 238.6Q265.0 243.2 258.5 246.7Q252.0 250.2 245.5 251.7ZM263.0 81.7Q261.0 82.2 254.0 82.2Q247.0 82.2 243.5 81.0Q240.0 79.7 236.5 77.5Q233.0 75.2 231.3 73.6Q229.6 72.0 227.2 68.5Q224.9 65.0 223.2 60.0Q221.6 55.0 221.7 48.0Q221.8 41.0 222.9 37.8Q224.0 34.6 225.9 31.3Q227.8 28.0 230.9 24.8Q234.0 21.6 236.0 20.2Q238.0 18.8 244.0 16.7Q250.0 14.6 254.0 14.6Q258.0 14.6 260.5 15.2Q263.0 15.8 268.0 18.2Q273.0 20.6 276.7 24.3Q280.4 28.0 281.8 30.0Q283.2 32.0 284.2 34.0Q285.2 36.0 286.3 40.0Q287.4 44.0 287.3 49.5Q287.2 55.0 285.7 59.5Q284.1 64.0 282.7 66.5Q281.2 69.0 278.1 72.2Q275.0 75.4 273.0 76.8Q271.0 78.2 268.0 79.7Q265.0 81.2 263.0 81.7Z";

// The dot on the mark, pulled out so we can paint it Kredilo emerald on top of the
// white wordmark/mark. Same coordinates in both viewBoxes, so it lines up either way.
const DOT_PATH =
  "M263.0 81.7Q261.0 82.2 254.0 82.2Q247.0 82.2 243.5 81.0Q240.0 79.7 236.5 77.5Q233.0 75.2 231.3 73.6Q229.6 72.0 227.2 68.5Q224.9 65.0 223.2 60.0Q221.6 55.0 221.7 48.0Q221.8 41.0 222.9 37.8Q224.0 34.6 225.9 31.3Q227.8 28.0 230.9 24.8Q234.0 21.6 236.0 20.2Q238.0 18.8 244.0 16.7Q250.0 14.6 254.0 14.6Q258.0 14.6 260.5 15.2Q263.0 15.8 268.0 18.2Q273.0 20.6 276.7 24.3Q280.4 28.0 281.8 30.0Q283.2 32.0 284.2 34.0Q285.2 36.0 286.3 40.0Q287.4 44.0 287.3 49.5Q287.2 55.0 285.7 59.5Q284.1 64.0 282.7 66.5Q281.2 69.0 278.1 72.2Q275.0 75.4 273.0 76.8Q271.0 78.2 268.0 79.7Q265.0 81.2 263.0 81.7Z";

export function Logo({
  className = "h-7 w-auto",
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <svg
      viewBox={markOnly ? MARK_VIEWBOX : FULL_VIEWBOX}
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Kredilo"
    >
      <path fillRule="evenodd" d={markOnly ? MARK_PATH : FULL_PATH} />
      <path d={DOT_PATH} fill="#10B981" />
    </svg>
  );
}
KREDILO_POLISH_EOF
echo "  src/components/Logo.tsx"
mkdir -p "src/components"
cat > "src/components/BottomDock.tsx" <<'KREDILO_POLISH_EOF'
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, LayoutDashboard, User, Wallet } from 'lucide-react';

// Four essentials only. Everything else lives inside one of these:
//  Dashboard = Explore Tasks + My Tasks, Wallet = Withdraw + Transactions,
//  Games = all games, Profile = settings + notifications + Help & Support.
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard/tasks', '/dashboard/my-tasks'], exact: '/dashboard' },
  { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet, match: ['/dashboard/wallet'] },
  { to: '/dashboard/games', label: 'Games', icon: Gamepad2, match: ['/dashboard/games', '/games/'] },
  { to: '/dashboard/profile', label: 'Profile', icon: User, match: ['/dashboard/profile', '/dashboard/notifications'] },
];

export function BottomDock() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-white/10 bg-[#0c0c0c]/90 p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.exact === pathname || item.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 text-[11px] font-bold transition-all duration-300 ${
                active ? 'text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {active && <span className="absolute inset-0 -z-0 rounded-full bg-emerald-400 shadow-[0_6px_22px_-6px_rgba(16,185,129,0.85)] animate-[popin_220ms_ease-out]" />}
              <item.icon size={20} strokeWidth={active ? 2.6 : 1.8} className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : 'group-active:scale-90'}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
KREDILO_POLISH_EOF
echo "  src/components/BottomDock.tsx"
mkdir -p "src/components"
cat > "src/components/GameShell.tsx" <<'KREDILO_POLISH_EOF'
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// The frame every game page sits in. Keeps a game feeling like a proper little page:
// an emerald glow backdrop, the game's own icon in a chip, the title and goal, the
// game itself, then the daily-reward note. Pass `icon` to show the game's mark.
export function GameShell({
  title,
  goal,
  children,
  icon: Icon,
}: {
  title: string;
  goal: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative mx-auto max-w-md">
      {/* emerald glow behind the game, so each page flows with the brand */}
      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative">
        <Link to="/dashboard/games" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white">
          <ArrowLeft size={16} /> Back to Games
        </Link>
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
              <Icon size={26} strokeWidth={1.8} />
            </span>
          )}
          <h1 className="title-glow text-4xl font-extrabold leading-none">{title}</h1>
        </div>
        <p className="mt-3 text-white/60">{goal}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
          Earn kreds once a day per game. Play your best round, then claim your reward.
        </p>
      </div>
    </div>
  );
}
KREDILO_POLISH_EOF
echo "  src/components/GameShell.tsx"
mkdir -p "src/components"
cat > "src/components/SectionHeader.tsx" <<'KREDILO_POLISH_EOF'
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// A page title with an optional tap-to-reveal description (smoothly animated) and an
// optional element pinned to the right edge (e.g. the streak badge).
export function SectionHeader({ title, info, right }: { title: string; info?: string; right?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="title-glow text-4xl font-extrabold">{title}</h1>
          {info && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Hide details' : 'Show details'}
              aria-expanded={open}
              className="pressable mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {right}
      </div>
      {info && (
        <div className={`grid transition-all duration-300 ease-out ${open ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <p className="max-w-xl text-white/55">{info}</p>
          </div>
        </div>
      )}
    </div>
  );
}
KREDILO_POLISH_EOF
echo "  src/components/SectionHeader.tsx"
mkdir -p "src/components"
cat > "src/components/AdminLayout.tsx" <<'KREDILO_POLISH_EOF'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldX, TriangleAlert } from 'lucide-react';
import { Logo } from './Logo';
import { adminNav } from '../lib/adminSections';
import { canSee } from '../lib/adminAccess';
import { useAuth } from '../lib/auth';

function Denied({ text, to, action }: { text: string; to: string; action: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <ShieldX size={48} className="text-white/50" />
      <h1 className="text-3xl font-extrabold">Access denied</h1>
      <p className="max-w-sm text-white/55">{text}</p>
      <Link to={to} className="mt-2 inline-flex min-h-12 items-center rounded-full bg-white px-7 text-sm font-bold text-black">{action}</Link>
    </div>
  );
}

export function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-white/50">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role === 'user') {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Denied text="This area is for Kredilo admins only." to="/dashboard" action="Back to dashboard" />
      </div>
    );
  }

  const section = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const allowed = canSee(user.role, section);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 overflow-hidden border-b border-emerald-400/15 bg-[#050505]/90 backdrop-blur-xl">
        <div aria-hidden className="emerald-beam pointer-events-none absolute inset-x-0 top-0 h-24" />
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto text-white" />
            <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-black">{user.role}</span>
          </div>
          <Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">
            <ArrowLeft size={16} /> Back to app
          </Link>
        </div>
        <nav aria-label="Admin" className="relative mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          <div className="flex w-max gap-1.5">
            {adminNav.filter((n) => canSee(user.role, n.path)).map((n) => (
              <NavLink
                key={n.path}
                to={n.path ? `/admin/${n.path}` : '/admin'}
                end={n.path === ''}
                className={({ isActive }) =>
                  `inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                    isActive ? 'border-emerald-400 bg-emerald-400 text-black shadow-[0_6px_22px_-8px_rgba(16,185,129,0.85)]' : 'border-white/15 text-white/65 hover:border-emerald-400/40 hover:text-white'
                  }`
                }
              >
                <n.icon size={16} /> {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <p className="mb-5 flex items-center gap-2 text-xs text-white/35">
          <TriangleAlert size={13} className="shrink-0" /> The server enforces every permission — screens only hide what your role can’t use.
        </p>
        <div className="animate-[fadeup_320ms_ease-out]">
          {allowed ? <Outlet /> : <Denied text="Your role does not include this section." to="/admin" action="Back to overview" />}
        </div>
      </main>
    </div>
  );
}
KREDILO_POLISH_EOF
echo "  src/components/AdminLayout.tsx"
mkdir -p "src"
cat > "src/index.css" <<'KREDILO_POLISH_EOF'
@import "tailwindcss";

@theme {
  --color-bg: #050505;
  --color-card: #111111;
  --color-card-border: rgba(255, 255, 255, 0.08);
  --color-muted: #a1a1aa;
  --radius-card: 1.25rem;
  --radius-button: 9999px;
  --font-display: 'Nunito', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Nunito', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: #050505;
  color: #ffffff;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background:
    radial-gradient(ellipse 80% 50% at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 50%),
    radial-gradient(ellipse 70% 60% at 0% 100%, rgba(16,185,129,0.06) 0%, transparent 55%),
    #050505;
}

/* Must live in a layer: unlayered rules beat Tailwind utilities and made
   text-black on white buttons invisible (white-on-white). */
@layer base {
  a {
    color: inherit;
    text-decoration: none;
  }
  button, input, select, textarea {
    font-family: inherit;
  }
  h1, h2, h3, h4 {
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }
}

/* Light beam from the concept art (top-right diagonal sweep) */
.light-beam {
  background: linear-gradient(215deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 30%, transparent 55%);
  -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
}

/* Emerald brand glow — ties sections together with the Kredilo colour. */
.emerald-beam {
  background: linear-gradient(215deg, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0.05) 32%, transparent 58%);
  -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
}
/* Soft emerald halo behind big page titles. */
.title-glow {
  text-shadow: 0 0 26px rgba(16, 185, 129, 0.22);
}
/* Emerald ring + lift for the element that should feel "live" on a screen. */
.glow-ring {
  box-shadow: 0 0 0 1px rgba(16,185,129,0.22), 0 12px 40px -12px rgba(16,185,129,0.4);
}

/* ---- Motion system ---------------------------------------------------- */
/* Fluid entrances + micro-interactions. Kept subtle and GPU-friendly.     */
@keyframes fadeup {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes kpop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
@keyframes popin {
  0%   { opacity: 0; transform: scale(0.94); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  100% { transform: translateX(100%); }
}
@keyframes floaty {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}

/* Stagger children on mount: add .stagger to a container, items fade up    */
.stagger > * { opacity: 0; animation: fadeup 420ms ease-out forwards; }
.stagger > *:nth-child(1) { animation-delay: 40ms; }
.stagger > *:nth-child(2) { animation-delay: 90ms; }
.stagger > *:nth-child(3) { animation-delay: 140ms; }
.stagger > *:nth-child(4) { animation-delay: 190ms; }
.stagger > *:nth-child(5) { animation-delay: 240ms; }
.stagger > *:nth-child(6) { animation-delay: 290ms; }
.stagger > *:nth-child(7) { animation-delay: 340ms; }
.stagger > *:nth-child(8) { animation-delay: 390ms; }

/* Skeleton loading shimmer */
.skeleton {
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  animation: shimmer 1.4s infinite;
}

/* Press feedback helper for cards/rows */
.pressable { transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease; }
.pressable:active { transform: scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
KREDILO_POLISH_EOF
echo "  src/index.css"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Profile.tsx" <<'KREDILO_POLISH_EOF'
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Bell, Camera, Check, ChevronRight, Copy, FileText, Gift, LifeBuoy, LogOut, Megaphone, MessageCircle, Pencil, ShieldCheck, Share2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest, changeUsername, removeAvatar, uploadAvatar, useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';
import { Kred } from '../../components/Kred';
import { SocialLinks } from '../../components/SocialLinks';
import { configuredSocials } from '../../lib/socials';
import { fileToDataUrl } from '../../lib/tasks';
import { getReferral } from '../../lib/referral';
import type { ReferralInfo } from '../../lib/referral';

function Row({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="pressable flex min-h-16 items-center gap-4 border-t border-white/5 py-3 first:border-t-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-white/50">{text}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-white/40" />
    </Link>
  );
}

function ReferralCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  useEffect(() => { getReferral().then(setInfo).catch(() => setInfo(null)); }, []);
  if (!info) return <div className="skeleton h-40 rounded-3xl" />;

  const link = `${window.location.origin}/signup?ref=${info.code}`;
  const copy = async (what: 'code' | 'link', value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Join me on Kredilo', text: `Use my code ${info.code} to join Kredilo and earn kreds.`, url: link }); } catch { copy('link', link); }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.12] to-transparent p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Gift size={18} /> Invite friends, earn {info.bonus} <Kred size={14} /></div>
      <p className="mt-1 text-sm text-white/55">You get {info.bonus} kreds each time someone you invite completes their first task.</p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="text-xs font-semibold text-white/45">Your referral code</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-2xl font-extrabold tracking-[0.2em]">{info.code}</div>
          <button onClick={() => copy('code', info.code)} className="pressable flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5">
            {copied === 'code' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => copy('link', link)} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
          {copied === 'link' ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
        </button>
        <button onClick={share} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
          <Share2 size={16} /> Share
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="text-xl font-extrabold">{info.count}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Invited</div>
        </div>
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-emerald-400">{info.earned} <Kred size={15} /></div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Earned</div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [viewAvatar, setViewAvatar] = useState(false);

  useEffect(() => {
    if (!viewAvatar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewAvatar(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [viewAvatar]);

  if (!user) return null;

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try { await uploadAvatar(await fileToDataUrl(file, 512)); await refresh(); } catch { /* ignore */ }
    finally { setAvatarBusy(false); }
  };
  const clearAvatar = async () => { setAvatarBusy(true); try { await removeAvatar(); await refresh(); } finally { setAvatarBusy(false); } };

  const resend = async () => {
    setNote('');
    try { await apiRequest('/api/auth/resend-verification', {}); setNote('A new verification link has been sent.'); }
    catch (err) { setNote(err instanceof Error ? err.message : 'Could not send the link.'); }
  };

  const saveName = async () => {
    const u = newName.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setNameErr('3-20 chars: lowercase letters, numbers or underscores.');
    setSavingName(true); setNameErr('');
    try { await changeUsername(u); await refresh(); setEditing(false); }
    catch (e) { setNameErr(e instanceof Error ? e.message : 'Could not update username.'); }
    finally { setSavingName(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Profile</h1>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user.avatar ? (
              <button type="button" onClick={() => setViewAvatar(true)} aria-label="View profile photo" className="pressable block rounded-full">
                <Avatar src={user.avatar} name={user.username} size={64} />
              </button>
            ) : (
              <Avatar src={user.avatar} name={user.username} size={64} />
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label="Change photo" className="pressable absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black text-white disabled:opacity-50">
              <Camera size={14} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div>
                <div className="flex items-center gap-2">
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={user.username} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
                  <button onClick={saveName} disabled={savingName} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditing(false); setNameErr(''); }} className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-xs font-bold">Cancel</button>
                </div>
                {nameErr && <p className="mt-1 text-xs text-red-400">{nameErr}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-extrabold">{user.username}</span>
                {user.role !== 'user' && <BadgeCheck size={17} className="shrink-0 text-emerald-400" aria-label="Admin" />}
                <button onClick={() => { setNewName(user.username); setEditing(true); }} aria-label="Edit username" className="pressable shrink-0 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><Pencil size={14} /></button>
              </div>
            )}
            <div className="truncate text-sm text-white/50">{user.email}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
              <span>ID: {user.id.slice(0, 8)} · {user.role === 'user' ? 'member' : user.role}</span>
              {user.avatar && <button onClick={clearAvatar} disabled={avatarBusy} className="font-bold text-white/50 underline underline-offset-4 disabled:opacity-50">Remove photo</button>}
            </div>
          </div>
        </div>

        {/* Verification notice ONLY while unverified */}
        {!user.emailVerified && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              Your email isn’t verified yet. Verify it to unlock rewards and withdrawals.
              <button onClick={resend} className="mt-2 block min-h-10 font-bold underline underline-offset-4">Send a new link</button>
              {note && <div className="mt-1 text-white/80">{note}</div>}
            </div>
          </div>
        )}

        {user.role !== 'user' && (
          <Link to="/admin" className="pressable mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
            Open Admin
          </Link>
        )}
      </div>

      <ReferralCard />

      <Link to="/dashboard/post" className="pressable flex min-h-16 items-center gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-3 hover:border-white/25">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Post a Task</span><span className="block text-sm text-white/50">Pay to have Kredilo users do a task for you</span></span>
        <ChevronRight size={18} className="shrink-0 text-white/40" />
      </Link>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <Row to="/dashboard/notifications" icon={Bell} title="Notifications" text="Task approvals, rejections and updates" />
        <Row to="/forgot-password" icon={ShieldCheck} title="Change password" text="Get a link to set a new password" />
      </div>

      <section id="help" className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <h2 className="pb-1 pt-3 text-sm font-extrabold uppercase tracking-wider text-white/45">Help &amp; Support</h2>
        <Row to="/faq" icon={LifeBuoy} title="FAQ" text="Answers about tasks, rewards and withdrawals" />
        <Row to="/contact" icon={MessageCircle} title="Contact Support" text="Report a problem or ask a question" />
        <Row to="/terms" icon={FileText} title="Terms of Service" text="The rules for using Kredilo" />
        <Row to="/privacy" icon={FileText} title="Privacy Policy" text="How your data is handled" />
      </section>

      {configuredSocials().length > 0 && (
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Follow Kredilo</span>
          <SocialLinks />
        </div>
      )}

      <button
        onClick={async () => { await logout(); navigate('/'); }}
        className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5"
      >
        <LogOut size={18} /> Log out
      </button>

      {viewAvatar && user.avatar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-[fadein_160ms_ease-out]" onClick={() => setViewAvatar(false)}>
          <button type="button" aria-label="Close" onClick={() => setViewAvatar(false)} className="pressable absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-white/10">
            <X size={22} />
          </button>
          <img src={user.avatar} alt="Your profile photo" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-3xl object-contain animate-[popin_200ms_ease-out]" />
        </div>
      )}
    </div>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/dashboard/Profile.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/Snake.tsx" <<'KREDILO_POLISH_EOF'
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2 } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SIZE = 15;
const GOAL = 50;
type Dir = 'U' | 'D' | 'L' | 'R';
type P = { x: number; y: number };
type Game = { snake: P[]; food: P; dir: Dir; score: number; status: 'idle' | 'playing' | 'over' };

const opposite: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
const delta: Record<Dir, P> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };

function randomFood(snake: P[]): P {
  for (;;) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function fresh(): Game {
  const snake = [{ x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }];
  return { snake, food: randomFood(snake), dir: 'R', score: 0, status: 'idle' };
}

function step(g: Game, queued: Dir): Game {
  if (g.status !== 'playing') return g;
  const dir = queued === opposite[g.dir] ? g.dir : queued;
  const head = { x: g.snake[0].x + delta[dir].x, y: g.snake[0].y + delta[dir].y };
  const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
  const hitSelf = g.snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return { ...g, dir, status: 'over' };
  const ate = head.x === g.food.x && head.y === g.food.y;
  const snake = [head, ...g.snake];
  if (!ate) snake.pop();
  return { ...g, dir, snake, food: ate ? randomFood(snake) : g.food, score: g.score + (ate ? 10 : 0) };
}

export default function SnakeGame() {
  const [game, setGame] = useState<Game>(fresh);
  const queued = useRef<Dir>('R');
  const touch = useRef<P | null>(null);

  const turn = useCallback((d: Dir) => {
    queued.current = d;
  }, []);

  const start = () => {
    queued.current = 'R';
    setGame({ ...fresh(), status: 'playing' });
  };

  useEffect(() => {
    if (game.status !== 'playing') return;
    const id = window.setInterval(() => setGame((g) => step(g, queued.current)), 150);
    return () => window.clearInterval(id);
  }, [game.status]);

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key];
      if (!d) return;
      e.preventDefault();
      turn(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const cells: ReactElement[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = game.snake.findIndex((s) => s.x === x && s.y === y);
      const isFood = game.food.x === x && game.food.y === y;
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`aspect-square rounded-[3px] ${
            idx === 0 ? 'bg-white' : idx > 0 ? 'bg-white/65' : isFood ? 'scale-75 rounded-full bg-white/90' : 'bg-white/[0.04]'
          }`}
        />,
      );
    }
  }

  const pad = (d: Dir, Icon: typeof ArrowUp, label: string) => (
    <button
      aria-label={label}
      onPointerDown={() => turn(d)}
      className="pressable flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] active:bg-white/25"
    >
      <Icon size={26} />
    </button>
  );

  return (
    <GameShell title="Snake" goal={`Eat food to grow. Reach a score of ${GOAL} to hit the goal.`} icon={Gamepad2}>
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Score: {game.score}</span>
        <span className="text-white/50">Goal: {GOAL}</span>
      </div>
      <div
        className="grid touch-none gap-px rounded-3xl border border-white/15 bg-[#0b0b0b] p-2"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
        }}
      >
        {cells}
      </div>

      {game.status !== 'playing' ? (
        <div className="mt-5 space-y-3 text-center">
          {game.status === 'over' && (
            <>
              <p className="font-bold">Game over — you scored {game.score}.</p>
              <GameResult game="snake" score={game.score} headline={game.score >= GOAL ? 'You reached the goal! 🎉' : 'Nice run!'} />
            </>
          )}
          <button onClick={start} className="pressable min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
            {game.status === 'over' ? 'Play Again' : 'Start Game'}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          {pad('U', ArrowUp, 'Up')}
          <div className="flex items-center gap-6">
            {pad('L', ArrowLeft, 'Left')}
            {pad('D', ArrowDown, 'Down')}
            {pad('R', ArrowRight, 'Right')}
          </div>
          <p className="mt-1 text-xs text-white/40">Swipe on the board, use arrow keys / WASD, or tap the buttons.</p>
        </div>
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/Snake.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/MemoryMatch.tsx" <<'KREDILO_POLISH_EOF'
import { useState } from 'react';
import { Cloud, Heart, LayoutGrid, Moon, Star, Sun, Zap } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const icons = [Star, Heart, Moon, Sun, Cloud, Zap];

function shuffled(): number[] {
  const deck = [...Array.from({ length: icons.length }, (_, i) => i), ...Array.from({ length: icons.length }, (_, i) => i)];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatch() {
  const [deck, setDeck] = useState<number[]>(shuffled);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        setTimeout(() => {
          setMatched((m) => [...m, a, b]);
          setOpen([]);
        }, 400);
      } else {
        setTimeout(() => setOpen([]), 800);
      }
    }
  };

  const restart = () => {
    setDeck(shuffled());
    setOpen([]);
    setMatched([]);
    setMoves(0);
  };

  const won = matched.length === deck.length;

  return (
    <GameShell title="Memory Match" goal="Flip two cards at a time and find all the matching pairs." icon={LayoutGrid}>
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Pairs: {matched.length / 2}/{icons.length}</span>
        <span className="text-white/50">Moves: {moves}</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {deck.map((v, i) => {
          const shown = open.includes(i) || matched.includes(i);
          const Icon = icons[v];
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={shown ? 'Card' : 'Hidden card'}
              className={`flex aspect-square items-center justify-center rounded-2xl border transition ${
                matched.includes(i) ? 'border-white/10 bg-white/10 text-white/50' : shown ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.05]'
              }`}
            >
              {shown && <Icon size={28} />}
            </button>
          );
        })}
      </div>
      {won && (
        <GameResult
          game="memory"
          score={Math.max(10, 50 - Math.max(0, moves - icons.length) * 3)}
          headline={`All pairs found in ${moves} moves!`}
        />
      )}
      <button onClick={restart} className="pressable mt-5 min-h-12 w-full rounded-full border border-white/25 text-sm font-bold hover:bg-white/5">
        {won ? 'Play Again' : 'Restart'}
      </button>
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/MemoryMatch.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/ReactionTest.tsx" <<'KREDILO_POLISH_EOF'
import { useEffect, useRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

// Faster reaction = more kreds. ~200ms → 30, 500ms+ → 0.
const reactionKreds = (ms: number) => Math.max(0, Math.min(30, Math.round((500 - ms) / 10)));

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export default function ReactionTest() {
  const [state, setState] = useState<State>('idle');
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const startAt = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const begin = () => {
    setState('waiting');
    timer.current = window.setTimeout(() => {
      startAt.current = Date.now();
      setState('ready');
    }, 1000 + Math.random() * 3000);
  };

  const press = () => {
    if (state === 'waiting') {
      window.clearTimeout(timer.current);
      setState('early');
    } else if (state === 'ready') {
      const t = Date.now() - startAt.current;
      setTime(t);
      setBest((b) => (b === null || t < b ? t : b));
      setState('result');
    } else {
      begin();
    }
  };

  const label: Record<State, string> = {
    idle: 'Tap to start',
    waiting: 'Wait for it...',
    ready: 'TAP NOW!',
    result: `${time} ms. Tap to try again`,
    early: 'Too soon! Tap to try again',
  };

  return (
    <GameShell title="Reaction Test" goal="Wait for the screen to turn white, then tap as fast as you can." icon={MousePointerClick}>
      <button
        onClick={press}
        className={`flex h-64 w-full items-center justify-center rounded-3xl border px-6 text-center text-2xl font-extrabold transition ${
          state === 'ready' ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.04]'
        }`}
      >
        {label[state]}
      </button>
      <p className="mt-4 text-center text-sm font-bold">{best === null ? 'No best time yet' : `Best: ${best} ms`}</p>
      {state === 'result' && best !== null && (
        <GameResult game="reaction" score={reactionKreds(best)} headline={`Best reaction: ${best} ms`} />
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/ReactionTest.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/TriviaQuiz.tsx" <<'KREDILO_POLISH_EOF'
import { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

type Q = { q: string; options: string[]; answer: number };

const BANK: Q[] = [
  { q: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], answer: 1 },
  { q: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
  { q: 'What is the chemical formula for water?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'In what year did Nigeria become independent?', options: ['1957', '1960', '1963', '1970'], answer: 1 },
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which Nigerian city is known as the “Centre of Excellence”?', options: ['Abuja', 'Lagos', 'Port Harcourt', 'Enugu'], answer: 1 },
  { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'], answer: 1 },
  { q: 'Which animal is known as the king of the jungle?', options: ['Tiger', 'Elephant', 'Lion', 'Leopard'], answer: 2 },
  { q: 'What is the currency of Nigeria?', options: ['Cedi', 'Naira', 'Franc', 'Shilling'], answer: 1 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'Which river is the longest in the world?', options: ['Amazon', 'Nile', 'Niger', 'Congo'], answer: 1 },
  { q: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit'], answer: 1 },
  { q: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { q: 'Who wrote “Things Fall Apart”?', options: ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Chimamanda Adichie'], answer: 1 },
  { q: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2 },
  { q: 'Which is NOT a primary colour?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 2 },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2 },
  { q: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], answer: 2 },
  { q: 'Who was the first President of Nigeria?', options: ['Nnamdi Azikiwe', 'Tafawa Balewa', 'Obafemi Awolowo', 'Yakubu Gowon'], answer: 0 },
  { q: 'What is the tallest mountain in Africa?', options: ['Mount Kenya', 'Mount Kilimanjaro', 'Mount Cameroon', 'Table Mountain'], answer: 1 },
  { q: 'Which country is the most populous in Africa?', options: ['Egypt', 'Ethiopia', 'Nigeria', 'South Africa'], answer: 2 },
  { q: 'What is the largest desert in the world?', options: ['Sahara', 'Gobi', 'Kalahari', 'Antarctic'], answer: 3 },
  { q: 'Which ocean lies to the south of Nigeria?', options: ['Indian', 'Atlantic', 'Pacific', 'Arctic'], answer: 1 },
  { q: 'What does WWW stand for?', options: ['World Wide Web', 'Web Wide World', 'Wide World Web', 'World Web Wide'], answer: 0 },
  { q: 'Which company makes the iPhone?', options: ['Samsung', 'Google', 'Apple', 'Nokia'], answer: 2 },
  { q: 'In football, how many players are on the pitch per team?', options: ['9', '10', '11', '12'], answer: 2 },
  { q: 'Which country won the 2022 FIFA World Cup?', options: ['France', 'Brazil', 'Argentina', 'Germany'], answer: 2 },
  { q: 'What does FC in a football club name usually mean?', options: ['Football Club', 'Final Cup', 'First Class', 'Field Centre'], answer: 0 },
  { q: 'Which Nigerian won a Nobel Prize in Literature?', options: ['Chinua Achebe', 'Wole Soyinka', 'Ben Okri', 'Femi Osofisan'], answer: 1 },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2 },
  { q: 'How many colours are in a rainbow?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { q: 'What is the main ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Pepper', 'Onion'], answer: 1 },
  { q: 'In anime, what is the ninja village of Naruto called?', options: ['Konoha', 'Suna', 'Kiri', 'Iwa'], answer: 0 },
  { q: 'Which anime features pirates searching for the One Piece?', options: ['Bleach', 'Naruto', 'One Piece', 'Fairy Tail'], answer: 2 },
  { q: 'In Dragon Ball, what is Goku\u2019s race?', options: ['Namekian', 'Saiyan', 'Human', 'Android'], answer: 1 },
  { q: 'What colour is Pikachu?', options: ['Red', 'Blue', 'Yellow', 'Green'], answer: 2 },
  { q: 'Which social app is known for short videos?', options: ['LinkedIn', 'TikTok', 'Reddit', 'Pinterest'], answer: 1 },
  { q: 'What does GPS stand for?', options: ['Global Positioning System', 'General Position Service', 'Global Position Service', 'Grid Point System'], answer: 0 },
  { q: 'How many minutes are in a full football match (excluding stoppage)?', options: ['80', '90', '100', '120'], answer: 1 },
  { q: 'What is the capital of Ghana?', options: ['Accra', 'Kumasi', 'Lagos', 'Lome'], answer: 0 },
  { q: 'Which is the longest river in Africa?', options: ['Niger', 'Congo', 'Nile', 'Zambezi'], answer: 2 },
  { q: 'What is 9 squared?', options: ['72', '81', '90', '99'], answer: 1 },
  { q: 'Which metal is liquid at room temperature?', options: ['Iron', 'Mercury', 'Aluminium', 'Copper'], answer: 1 },
  { q: 'What is the national sport most loved in Nigeria?', options: ['Cricket', 'Football', 'Rugby', 'Tennis'], answer: 1 },
  { q: 'Which artist sang \u201cEssence\u201d with Tems?', options: ['Burna Boy', 'Wizkid', 'Davido', 'Rema'], answer: 1 },
  { q: 'What does ATM stand for?', options: ['Automated Teller Machine', 'Any Time Money', 'Automatic Transfer Machine', 'Account Transaction Mode'], answer: 0 },
  { q: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], answer: 1 },
  { q: 'Which continent is Egypt in?', options: ['Asia', 'Europe', 'Africa', 'South America'], answer: 2 },
  { q: 'What is the boiling point of water in Celsius?', options: ['90', '100', '110', '120'], answer: 1 },
  { q: 'Which planet has the most rings?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  { q: 'What is the first letter of the Greek alphabet?', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: 0 },
];

const ROUND = 10;

function pickRound(): Q[] {
  const d = [...BANK];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d.slice(0, ROUND);
}

export default function TriviaQuiz() {
  const [round, setRound] = useState<Q[]>(pickRound);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const questions = round;
  const done = index >= questions.length;
  const cur = useMemo(() => questions[index], [questions, index]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[index].answer) setScore((s) => s + 1);
  };

  const restart = () => { setRound(pickRound()); setIndex(0); setPicked(null); setScore(0); };

  if (done) {
    return (
      <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge." icon={ListChecks}>
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
          <div className="text-6xl font-extrabold">{score}/{questions.length}</div>
          <p className="mt-2 text-white/60">correct answers</p>
        </div>
        <GameResult game="trivia" score={score * 4} headline={`You got ${score} of ${questions.length} right!`} />
        <button onClick={restart} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
      </GameShell>
    );
  }

  return (
    <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge." icon={ListChecks}>
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Question {index + 1}/{questions.length}</span>
        <span className="text-white/50">Score: {score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <h2 className="text-xl font-extrabold leading-snug">{cur.q}</h2>
      <div className="mt-4 space-y-2.5">
        {cur.options.map((o, i) => {
          const right = picked !== null && i === cur.answer;
          const wrong = picked === i && i !== cur.answer;
          return (
            <button
              key={o}
              onClick={() => pick(i)}
              className={`flex min-h-14 w-full items-center rounded-2xl border px-5 text-left text-sm font-bold transition ${
                right ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : wrong ? 'border-red-400 bg-red-500/15 text-red-300' : 'border-white/20 bg-white/[0.03] hover:bg-white/10'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          onClick={() => { setIndex((n) => n + 1); setPicked(null); }}
          className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
        >
          {index + 1 === questions.length ? 'See Result' : 'Next Question'}
        </button>
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/TriviaQuiz.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/ColorMatch.tsx" <<'KREDILO_POLISH_EOF'
import { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' },
];
const SECONDS = 30;

type Prompt = { word: string; ink: string; match: boolean };
function nextPrompt(): Prompt {
  const wi = Math.floor(Math.random() * COLORS.length);
  const shouldMatch = Math.random() < 0.5;
  const ii = shouldMatch ? wi : (wi + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
  return { word: COLORS[wi].name, ink: COLORS[ii].hex, match: wi === ii };
}

export default function ColorMatch() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [prompt, setPrompt] = useState<Prompt>(nextPrompt);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setPrompt(nextPrompt()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const answer = (said: boolean) => {
    if (state !== 'playing') return;
    const correct = said === prompt.match;
    if (correct) setScore((s) => s + 1);
    setFlash(correct ? 'ok' : 'no');
    window.setTimeout(() => setFlash(null), 150);
    setPrompt(nextPrompt());
  };

  return (
    <GameShell title="Color Match" goal="Does the WORD match the COLOUR it is written in? Answer as many as you can in 30 seconds." icon={Palette}>
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-40 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 'ok' ? 'border-emerald-400' : flash === 'no' ? 'border-red-400' : 'border-white/15'}`}>
            <span style={{ color: prompt.ink }}>{prompt.word}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => answer(true)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">Match</button>
            <button onClick={() => answer(false)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">No match</button>
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">correct in {SECONDS}s</p></div>
          <GameResult game="stroop" score={score * 2} headline={`You matched ${score} correctly!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/ColorMatch.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/MathSprint.tsx" <<'KREDILO_POLISH_EOF'
import { useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 30;
type Problem = { text: string; answer: number; options: number[] };

function makeProblem(): Problem {
  const ops = ['+', '-', '\u00d7'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  let answer: number;
  if (op === '+') answer = a + b;
  else if (op === '-') { if (b > a) { const tmp = a; a = b; b = tmp; } answer = a - b; }
  else answer = a * b;
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = Math.floor(Math.random() * 9) - 4;
    const cand = answer + delta + (delta === 0 ? 1 : 0);
    if (cand >= 0) set.add(cand);
  }
  const options = [...set].sort(() => Math.random() - 0.5);
  return { text: `${a} ${op} ${b}`, answer, options };
}

export default function MathSprint() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [problem, setProblem] = useState<Problem>(makeProblem);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setProblem(makeProblem()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const pick = (v: number) => {
    if (state !== 'playing') return;
    if (v === problem.answer) setScore((s) => s + 1);
    setFlash(v === problem.answer ? 1 : 0);
    window.setTimeout(() => setFlash(null), 120);
    setProblem(makeProblem());
  };

  return (
    <GameShell title="Math Sprint" goal="Solve as many as you can in 30 seconds. Tap the correct answer." icon={Calculator}>
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-32 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 1 ? 'border-emerald-400' : flash === 0 ? 'border-red-400' : 'border-white/15'}`}>{problem.text}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {problem.options.map((o) => (
              <button key={o} onClick={() => pick(o)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-xl font-extrabold hover:bg-white/10">{o}</button>
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">solved in {SECONDS}s</p></div>
          <GameResult game="math" score={score * 2} headline={`You solved ${score}!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/MathSprint.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/TapTiles.tsx" <<'KREDILO_POLISH_EOF'
import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 20;
const TILES = 9;

export default function TapTiles() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [active, setActive] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [miss, setMiss] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setActive(Math.floor(Math.random() * TILES)); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const tap = (i: number) => {
    if (state !== 'playing') return;
    if (i === active) {
      setScore((s) => s + 1);
      setActive((cur) => { let n = cur; while (n === cur) n = Math.floor(Math.random() * TILES); return n; });
    } else {
      setMiss(true); window.setTimeout(() => setMiss(false), 120);
    }
  };

  return (
    <GameShell title="Tap Tiles" goal="Tap the emerald tile as fast as you can. You have 20 seconds." icon={Target}>
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className={miss ? 'text-red-400' : 'text-white/50'}>{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: TILES }).map((_, i) => (
              <button key={i} onClick={() => tap(i)} aria-label="tile" className={`pressable aspect-square rounded-2xl border transition ${i === active ? 'border-emerald-400 bg-emerald-500/80' : 'border-white/15 bg-white/[0.04] hover:bg-white/10'}`} />
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">taps in {SECONDS}s</p></div>
          <GameResult game="tiles" score={score} headline={`You tapped ${score} tiles!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_POLISH_EOF
echo "  src/pages/games/TapTiles.tsx"

echo ""
echo "Done. Next:"
echo "  1) cd server && npm test      # expect 78 pass, 0 fail"
echo "  2) cd ..     && npm run build  # type-check + build"
echo "  3) git add -A && git commit -m 'polish: pill dock, emerald logo + glow, clean referral copy, proper game pages' && git push"
