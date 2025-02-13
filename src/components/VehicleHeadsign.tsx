import { Skeleton } from "@mui/material";
import { City, VehicleType } from "../util/typings";
import { Color, Icon } from "./Icons";
import styled from "@emotion/styled";

const LineNumber = styled.b((props: {
    backgroundColor: string,
}) => ({
    color: "white",
    backgroundColor: props.backgroundColor,
    borderRadius: 25,
    padding: 1,
    paddingLeft: 10,
    paddingRight: 10,
    display: "inline-flex",
    alignItems: "center"
}));

export default ({ type, route, headsign, city, iconSize, skeletonWidth }: { type?: VehicleType, route?: string, headsign?: string, city?: City, iconSize?: number, skeletonWidth?: number }) => {
    return <div style={{ display: "inline-flex", alignItems: "center" }}>
        {(type != null && route != null && headsign != null && city != null) ? <>
            <LineNumber backgroundColor={Color(type, city)}><Icon type={type} style={{ width: iconSize || 18, height: iconSize || 18 }} />&nbsp;{route}</LineNumber>{headsign && <>&nbsp;{headsign}</>}
        </> : <>
            <Skeleton variant="rectangular" width={55} height={29} style={{ borderRadius: 15 }} />&nbsp;<Skeleton variant="text" width={skeletonWidth || 80} height={19} />
        </>}
    </div>;
};

export { LineNumber };