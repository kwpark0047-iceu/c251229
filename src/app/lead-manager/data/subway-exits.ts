/**
 * 지하철 출입구 좌표 데이터 (WGS84)
 * 서울시 보행자 출입구 정보(OA-21699) 및 열린데이터광장 기반
 */

export interface SubwayExit {
  stationName: string;
  exitNo: string;
  lat: number;
  lng: number;
}

export const SUBWAY_EXITS: SubwayExit[] = [
  // 강남역 (Gangnam)
  { stationName: '강남', exitNo: '1', lat: 37.49861, lng: 127.02854 },
  { stationName: '강남', exitNo: '2', lat: 37.49757, lng: 127.02847 },
  { stationName: '강남', exitNo: '3', lat: 37.49704, lng: 127.02856 },
  { stationName: '강남', exitNo: '4', lat: 37.49658, lng: 127.02881 },
  { stationName: '강남', exitNo: '5', lat: 37.49615, lng: 127.02796 },
  { stationName: '강남', exitNo: '6', lat: 37.49662, lng: 127.02737 },
  { stationName: '강남', exitNo: '7', lat: 37.49735, lng: 127.02704 },
  { stationName: '강남', exitNo: '8', lat: 37.49818, lng: 127.02672 },
  { stationName: '강남', exitNo: '9', lat: 37.49877, lng: 127.02646 },
  { stationName: '강남', exitNo: '10', lat: 37.49931, lng: 127.02728 },
  { stationName: '강남', exitNo: '11', lat: 37.49959, lng: 127.02798 },
  { stationName: '강남', exitNo: '12', lat: 37.49909, lng: 127.02868 },

  // 역삼역 (Yeoksam)
  { stationName: '역삼', exitNo: '1', lat: 37.50005, lng: 127.03611 },
  { stationName: '역삼', exitNo: '2', lat: 37.50002, lng: 127.03723 },
  { stationName: '역삼', exitNo: '3', lat: 37.50075, lng: 127.03756 },
  { stationName: '역삼', exitNo: '4', lat: 37.50153, lng: 127.03722 },
  { stationName: '역삼', exitNo: '5', lat: 37.50162, lng: 127.03608 },
  { stationName: '역삼', exitNo: '6', lat: 37.50158, lng: 127.03502 },
  { stationName: '역삼', exitNo: '7', lat: 37.50085, lng: 127.03468 },
  { stationName: '역삼', exitNo: '8', lat: 37.50008, lng: 127.03502 },

  // 선릉역 (Seolleung)
  { stationName: '선릉', exitNo: '1', lat: 37.50422, lng: 127.04968 },
  { stationName: '선릉', exitNo: '2', lat: 37.50375, lng: 127.04935 },
  { stationName: '선릉', exitNo: '3', lat: 37.50335, lng: 127.04868 },
  { stationName: '선릉', exitNo: '4', lat: 37.50302, lng: 127.04785 },
  { stationName: '선릉', exitNo: '5', lat: 37.50435, lng: 127.04702 },
  { stationName: '선릉', exitNo: '6', lat: 37.50522, lng: 127.04735 },
  { stationName: '선릉', exitNo: '7', lat: 37.50568, lng: 127.04802 },
  { stationName: '선릉', exitNo: '8', lat: 37.50615, lng: 127.04885 },
  { stationName: '선릉', exitNo: '9', lat: 37.50522, lng: 127.04968 },
  { stationName: '선릉', exitNo: '10', lat: 37.50475, lng: 127.04968 },

  // 삼성역 (Samseong)
  { stationName: '삼성', exitNo: '1', lat: 37.50808, lng: 127.06385 },
  { stationName: '삼성', exitNo: '2', lat: 37.50753, lng: 127.06452 },
  { stationName: '삼성', exitNo: '3', lat: 37.50822, lng: 127.06568 },
  { stationName: '삼성', exitNo: '4', lat: 37.50892, lng: 127.06515 },
  { stationName: '삼성', exitNo: '5', lat: 37.50975, lng: 127.06302 },
  { stationName: '삼성', exitNo: '6', lat: 37.51035, lng: 127.06235 },
  { stationName: '삼성', exitNo: '7', lat: 37.50975, lng: 127.06102 },
  { stationName: '삼성', exitNo: '8', lat: 37.50908, lng: 127.06168 },
];
