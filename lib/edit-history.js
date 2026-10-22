// In-tab editing history only. It does not replace saving or crash recovery.
export class EditHistory {
 constructor(limit=20){this.limit=limit;this.reset(null);}
 reset(value){this.current=value===null?null:structuredClone(value);this.past=[];this.future=[];this.group=null;}
 record(value,group=null){if(this.current===null){this.reset(value);return;}if(JSON.stringify(value)===JSON.stringify(this.current))return;if(!group||group!==this.group){this.past.push(this.current);if(this.past.length>this.limit)this.past.shift();}this.current=structuredClone(value);this.future=[];this.group=group;}
 undo(){if(!this.past.length)return null;this.future.push(this.current);this.current=this.past.pop();this.group=null;return structuredClone(this.current);}
 redo(){if(!this.future.length)return null;this.past.push(this.current);this.current=this.future.pop();this.group=null;return structuredClone(this.current);}
}
