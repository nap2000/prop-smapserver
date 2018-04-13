import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;


public class Billing {

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		

		Connection connectionSD = null;
		String response = "";
		String dbClass = "org.postgresql.Driver";
		String sd_db = "jdbc:postgresql://127.0.0.1:5432/survey_definitions";
		
		try {
		    Class.forName(dbClass);	 
			connectionSD = DriverManager.getConnection(sd_db, "ws", "ws1234");
				
			CheckDisk cd = new CheckDisk();
			cd.check(connectionSD, "/smap");
			
		} catch (ApplicationException e) {		
			System.out.println("        " + e.getMessage());	
		} catch (Exception e) {	
			e.printStackTrace();
		} finally {
			try {
				if (connectionSD != null) {
					connectionSD.close();
				}
			} catch (Exception e) {
				
			}
		} 		

	}
	
	

}
