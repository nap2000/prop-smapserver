import java.io.File;
import java.util.logging.Logger;

public class Utilities {

	private static Logger log =
			 Logger.getLogger(Utilities.class.getName());
	
	public static void deleteDirectory(File d) throws Exception {
		String[]entries = d.list();
		for(String e: entries){
		    File f = new File(d.getPath(), e);
		    if(f.isDirectory()) {
		    		deleteDirectory(f);
		    		deleteFile(f);
		    } else {
		    		deleteFile(f);
		    }
		}
	}
	
	public static void deleteFile(File f) throws Exception {
		if(f.getAbsolutePath().startsWith("/smap/uploadedSurveys")) {
			log.info("=========== deleting: " + f.getAbsolutePath());
			boolean success = f.delete();
			if(!success) {
				log.info("########### Error failed to delete: " + f.getAbsolutePath());
			}
		} else {
			throw new Exception("Attempting to delete directory outside valid range");
		}
	}
	
	public static long dirSize(File dir) {
	    long length = 0;
	    for (File file : dir.listFiles()) {
	        if (file.isFile())
	            length += file.length();
	        else if (file.isDirectory())
	            length += dirSize(file);
	    }
	    return length;
	}
}
