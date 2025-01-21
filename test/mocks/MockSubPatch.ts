/**
 * The way sub-patches work is there is an ObjectNode that defines a subpatch object
 * which then instantiates this class for that node-- passing itself and the parent patcher
 * whenever that parent node gets a message it looks for objects inside this patch called "in 1/2/3"
 * depending on the inlet received on, and sends it to there
 * this patch will work just as the other patch, and end at an "out 1" which will trigger
 * a compile() call, which we will simply pass out the outlet of the parent node
 */
