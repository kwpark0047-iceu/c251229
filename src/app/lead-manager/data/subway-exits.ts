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
  
  // 서울역 (Seoul Station)
  { stationName: '서울역', exitNo: '1', lat: 37.5532, lng: 126.9726 },
  { stationName: '서울역', exitNo: '2', lat: 37.5548, lng: 126.9712 },
  { stationName: '서울역', exitNo: '14', lat: 37.5524, lng: 126.9715 },

  // 홍대입구역 (Hongik Univ.)
  { stationName: '홍대입구', exitNo: '1', lat: 37.5552, lng: 126.9213 },
  { stationName: '홍대입구', exitNo: '8', lat: 37.5574, lng: 126.9244 },
  { stationName: '홍대입구', exitNo: '9', lat: 37.5568, lng: 126.9238 },

  // 명동역 (Myeong-dong)
  { stationName: '명동', exitNo: '5', lat: 37.5606, lng: 126.9835 },
  { stationName: '명동', exitNo: '6', lat: 37.5609, lng: 126.9858 },
  { stationName: '명동', exitNo: '8', lat: 37.5615, lng: 126.9863 },

  // 여의도역 (Yeouido)
  { stationName: '여의도', exitNo: '1', lat: 37.5218, lng: 126.9241 },
  { stationName: '여의도', exitNo: '3', lat: 37.5228, lng: 126.9231 },
  { stationName: '여의도', exitNo: '5', lat: 37.5215, lng: 126.9232 },

  // 광화문역 (Gwanghwamun)
  { stationName: '광화문', exitNo: '1', lat: 37.5726, lng: 126.9754 },
  { stationName: '광화문', exitNo: '6', lat: 37.5701, lng: 126.9763 },
  { stationName: '광화문', exitNo: '7', lat: 37.5714, lng: 126.9761 },

  // 잠실역 (Jamsil)
  { stationName: '잠실', exitNo: '1', lat: 37.5146, lng: 127.1009 },
  { stationName: '잠실', exitNo: '7', lat: 37.5149, lng: 127.1002 },
  { stationName: '잠실', exitNo: '8', lat: 37.5141, lng: 127.1018 },

  // 성수역 (Seongsu)
  { stationName: '성수', exitNo: '1', lat: 37.5451, lng: 127.0545 },
  { stationName: '성수', exitNo: '2', lat: 37.5453, lng: 127.0569 },
  { stationName: '성수', exitNo: '3', lat: 37.5435, lng: 127.0567 },
  { stationName: '성수', exitNo: '4', lat: 37.5432, lng: 127.0544 },

  // 신논현역 (Sinnonhyeon)
  { stationName: '신논현', exitNo: '1', lat: 37.5042, lng: 127.0238 },
  { stationName: '신논현', exitNo: '6', lat: 37.5041, lng: 127.0254 },
  { stationName: '신논현', exitNo: '7', lat: 37.5048, lng: 127.0252 },
  { stationName: '신논현', exitNo: '9', lat: 37.5054, lng: 127.0248 },

  // 압구정역 (Apgujeong)
  { stationName: '압구정', exitNo: '2', lat: 37.5273, lng: 127.0289 },
  { stationName: '압구정', exitNo: '3', lat: 37.5265, lng: 127.0282 },
  { stationName: '압구정', exitNo: '4', lat: 37.5262, lng: 127.0271 },

  // 신사역 (Sinsa)
  { stationName: '신사', exitNo: '1', lat: 37.5174, lng: 127.0199 },
  { stationName: '신사', exitNo: '4', lat: 37.5158, lng: 127.0195 },
  { stationName: '신사', exitNo: '8', lat: 37.5169, lng: 127.0211 },

  // 고속터미널역 (Express Bus Terminal)
  { stationName: '고속터미널', exitNo: '1', lat: 37.5055, lng: 127.0041 },
  { stationName: '고속터미널', exitNo: '8', lat: 37.5052, lng: 127.0069 },
  { stationName: '고속터미널', exitNo: '9', lat: 37.5042, lng: 127.0051 },

  // 종로3가역 (Jongno 3-ga)
  { stationName: '종로3가', exitNo: '1', lat: 37.5702, lng: 126.9904 },
  { stationName: '종로3가', exitNo: '5', lat: 37.5714, lng: 126.9918 },
  { stationName: '종로3가', exitNo: '15', lat: 37.5706, lng: 126.9925 },
];
