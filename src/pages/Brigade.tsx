import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { List, ListItemButton, ListItemText, Divider, Typography, Box, Skeleton, ListItem } from "@mui/material";
import { toast } from "react-hot-toast";
import { BrigadeSchedule, City } from "../util/typings";
import { getData } from "../util/api";

export default ({ city }: { city: City }) => {
    const { line, brigade } = useParams();
    const [schedule, setSchedule] = useState<BrigadeSchedule[]>();

    useEffect(() => {
        document.body.setAttribute("style", `${document.body.getAttribute("style")} overflow: auto;`);
        getData("brigade", city, {
            line,
            brigade
        }).then(setSchedule).catch(() => {
            toast.error("Nie mogliśmy pobrać rozkładu brygad...");
            window.history.back();
        });
    }, [line, brigade]);

    return <Box sx={{
        textAlign: "center",
        mx: "auto",
        "@media (max-width: 599px)": {
            width: "100%"
        },
        "@media (min-width: 600px)": {
            width: "80%"
        }
    }}>
        <h1 style={{ fontWeight: "normal" }}>Rozkład brygady <b>{line}</b>/{brigade}</h1>

        {schedule ? (schedule.length ? <List>
            {schedule.map<React.ReactNode>(sched => <ListItemButton key={sched.trip} component={Link} to={`../trip?trip=${sched.trip}`}>
                <ListItemText primary={<Typography noWrap>{sched.headsign}</Typography>} secondary={<>z przystanku {sched.firstStop}</>} />
                <span style={{ textAlign: "right" }}>
                    <ListItemText
                        primary={<><span style={{ textDecoration: sched.realStart ? "line-through" : "" }}>{timeString(sched.start)}</span> {sched.realStart ? <span style={{ color: "red" }}>{timeString(sched.realStart)}</span> : null}</>}
                        secondary={<><span style={{ textDecoration: sched.realEnd ? "line-through" : "" }}>{timeString(sched.end)}</span> {sched.realEnd ? <span style={{ color: "red" }}>{timeString(sched.realEnd)}</span> : null}</>}
                    />
                </span>
            </ListItemButton>).reduce((prev, curr, i) => [prev, <Divider key={i} textAlign="left" style={{ color: "#9ba1ab", fontSize: 14 }}>{(schedule[i].start - schedule[i - 1]!.end) / 60000 < 60 ? schedule[i].realStart ? <span style={{ color: "red" }}>Brak postoju z powodu zbyt dużego opóźnienia.</span> : <>Postój {Math.floor((schedule[i].start - schedule[i - 1]!.end) / 60000)} min</> : null}</Divider>, curr])}
        </List> : <h4>Nie mogliśmy znaleźć rozkładu dla tej brygady...</h4>) : <List>
            {new Array(15).fill(0).map<React.ReactNode>((_, i) => <ListItem key={i}><ListItemText primary={<Skeleton variant="text" width={100} />} secondary={<Skeleton variant="text" width={150} />} /><ListItemText sx={{ right: 0, position: "absolute" }} primary={<Skeleton variant="text" width={60} sx={{ textAlign: "right" }} />} secondary={<Skeleton variant="text" width={60} />} /></ListItem>).reduce((prev, curr, i) => [prev, <Divider key={`1-${i}`} />, curr])}
        </List>}
    </Box>;
};

function timeString(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString("pl", { hour12: false, hour: "2-digit", minute: "2-digit" });
}