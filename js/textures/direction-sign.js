/* Blue direction panels on a fork. */
import { __tram, T, $ } from "../runtime.js";

__tram.dirPanelTex=function dirPanelTex(B,left){
  return __tram.canvasTex(320,170,(g)=>{
    g.fillStyle="#1d4f9c"; __tram.rr(g,2,2,316,166,14); g.fill(); g.strokeStyle="#ffffff"; g.lineWidth=6; __tram.rr(g,10,10,300,150,10); g.stroke();
    g.fillStyle="#ffffff"; g.save(); g.translate(left?52:268,62); g.rotate(left?-Math.PI/4:Math.PI/4);
    g.beginPath(); g.moveTo(0,-30); g.lineTo(20,-6); g.lineTo(7,-6); g.lineTo(7,28); g.lineTo(-7,28); g.lineTo(-7,-6); g.lineTo(-20,-6); g.closePath(); g.fill(); g.restore();
    g.font="bold 38px Arial, sans-serif"; g.textBaseline="middle"; g.textAlign=left?"left":"right";
    let size=38; while(size>22){ g.font=`bold ${size}px Arial, sans-serif`; if(g.measureText(B.dest).width<200) break; size-=2; }
    g.fillText(B.dest,left?92:228,62);
    g.fillStyle="#ffffff"; __tram.rr(g,26,108,268,40,6); g.fill();
    g.fillStyle="#1d4f9c"; g.font="bold 22px Arial, sans-serif"; g.textAlign="center"; g.fillText(__tram.ROUTE_TAG[B.type].toUpperCase(),160,129);
  },false);
}

