import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.logging.Logger;


public class Billing {

	private static Logger log =
			 Logger.getLogger(Billing.class.getName());
	
	/**
	 * @param args
	 */
	public static void main(String[] args) {
		

		Connection sd = null;
		String dbClass = "org.postgresql.Driver";
		String sd_db = "jdbc:postgresql://127.0.0.1:5432/survey_definitions";
		
		try {
		    Class.forName(dbClass);	 
			sd = DriverManager.getConnection(sd_db, "ws", "ws1234");
				
			CheckDisk cd = new CheckDisk();
			cd.check(sd, "/smap");
			
		} catch (ApplicationException e) {		
			log.info("        " + e.getMessage());	
		} catch (Exception e) {	
			e.printStackTrace();
		} finally {
			try {
				if (sd != null) {
					sd.close();
				}
			} catch (Exception e) {
				
			}
		} 		

	}
	
	

}
